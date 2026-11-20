import json
import os
import socket
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from flask import Flask, jsonify, render_template, request

app = Flask(__name__, static_folder="static", template_folder="templates")

DAILY_QUOTE_FALLBACK = "你瞅啥"
QUOTE_CACHE = {
    "date": None,
    "quote": DAILY_QUOTE_FALLBACK,
    "is_fallback": True,
    "debug": {},
}
QUOTE_LOCK = threading.Lock()

NTP_SERVER = os.environ.get("NTP_SERVER") or "ntp.aliyun.com"
NTP_PORT = int(os.environ.get("NTP_PORT") or "123")
NTP_TIMEOUT_SEC = float(os.environ.get("NTP_TIMEOUT_SEC") or "2.5")

RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 30
RATE_LIMIT_MAX_KEYS = 10_000
RATE_LIMITER = defaultdict(deque)
RATE_LIMIT_LOCK = threading.Lock()


@app.route("/")
def index():
    return render_template("index.html")


def _today_str() -> str:
    try:
        now = datetime.now(ZoneInfo("Asia/Shanghai"))
    except Exception:
        now = datetime.now(timezone(timedelta(hours=8)))
    return now.strftime("%Y-%m-%d")


def _stringify_content(content: object) -> str:
    if isinstance(content, list):
        text_parts = []
        for item in content:
            if isinstance(item, dict):
                if item.get("type") == "text":
                    text_parts.append(item.get("text") or "")
                elif "content" in item:
                    text_parts.append(str(item.get("content") or ""))
            elif item is not None:
                text_parts.append(str(item))
        return "".join(text_parts).strip()
    return str(content or "").strip()


def _extract_quote(response_data: dict) -> str:
    choices = response_data.get("choices") or []
    if choices:
        first_choice = choices[0] or {}
        message = first_choice.get("message") or {}
        content = _stringify_content(message.get("content"))
        if content:
            return content

        text = _stringify_content(first_choice.get("text"))
        if text:
            return text

        delta = first_choice.get("delta") or {}
        delta_content = _stringify_content(delta.get("content"))
        if delta_content:
            return delta_content

    for key in ("output_text", "response", "result"):
        value = response_data.get(key)
        if isinstance(value, dict):
            nested = _stringify_content(value.get("response") or value.get("output_text"))
            if nested:
                return nested
        else:
            direct = _stringify_content(value)
            if direct:
                return direct

    return DAILY_QUOTE_FALLBACK


def _truncate_text(value: object, limit: int = 800) -> str:
    text = _stringify_content(value)
    if len(text) <= limit:
        return text
    return text[:limit].strip() + "…"


def _call_quote_api(today: str) -> tuple[str, bool, dict]:
    api_key = os.environ.get("DAILY_QUOTE_API_KEY", "")
    api_url = os.environ.get("DAILY_QUOTE_API_URL", "")
    model_name = os.environ.get("DAILY_QUOTE_MODEL", "")

    if not api_key or not api_url or not model_name:
        missing = [
            name
            for name, value in (
                ("DAILY_QUOTE_API_KEY", api_key),
                ("DAILY_QUOTE_API_URL", api_url),
                ("DAILY_QUOTE_MODEL", model_name),
            )
            if not value
        ]
        return DAILY_QUOTE_FALLBACK, True, {
            "stage": "config",
            "error": "missing_env",
            "missing": missing,
        }

    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": "你是一个名言生成助手。"},
            {
                "role": "user",
                "content": f"请给出{today}的每日名言，只返回一句中文名言，不要带序号和解释。",
            },
        ],
        "temperature": 0.8,
        "stream": False,
    }

    req = Request(
        api_url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "curl/7.88.1",
            "Accept": "application/json",
            "Connection": "close",
        },
    )

    status_code = None
    try:
        with urlopen(req, timeout=8) as resp:
            status_code = getattr(resp, "status", None)
            raw_text = resp.read(1024 * 1024).decode("utf-8", errors="replace")
            data = json.loads(raw_text)
            quote = _extract_quote(data)
            is_fallback = quote == DAILY_QUOTE_FALLBACK
            debug = {
                "stage": "response",
                "status": status_code,
                "is_json": True,
                "excerpt": _truncate_text(raw_text),
            }
            if is_fallback:
                debug["error"] = "empty_quote"
            return quote, is_fallback, debug
    except HTTPError as err:
        err_body = err.read(65536).decode("utf-8", errors="replace")
        return DAILY_QUOTE_FALLBACK, True, {
            "stage": "request",
            "error": "http_error",
            "status": err.code,
            "excerpt": _truncate_text(err_body),
        }
    except json.JSONDecodeError as err:
        return DAILY_QUOTE_FALLBACK, True, {
            "stage": "response",
            "error": "invalid_json",
            "status": status_code or 200,
            "detail": str(err),
        }
    except TimeoutError:
        return DAILY_QUOTE_FALLBACK, True, {
            "stage": "request",
            "error": "timeout",
        }
    except URLError as err:
        if isinstance(err.reason, TimeoutError):
            return DAILY_QUOTE_FALLBACK, True, {
                "stage": "request",
                "error": "timeout",
            }
        return DAILY_QUOTE_FALLBACK, True, {
            "stage": "request",
            "error": "url_error",
            "detail": str(err.reason),
        }
    except Exception as err:
        return DAILY_QUOTE_FALLBACK, True, {
            "stage": "request",
            "error": "unexpected_error",
            "detail": str(err),
        }


def _check_rate_limit(client_ip: str) -> bool:
    now = time.time()
    with RATE_LIMIT_LOCK:
        q = RATE_LIMITER[client_ip]
        while q and now - q[0] > RATE_LIMIT_WINDOW:
            q.popleft()
        if len(q) >= RATE_LIMIT_MAX:
            return False
        q.append(now)
        # 安全阀：X-Forwarded-For 可被伪造，防止伪造大量假 IP 导致字典无限膨胀
        if len(RATE_LIMITER) > RATE_LIMIT_MAX_KEYS:
            stale = [
                ip
                for ip, dq in RATE_LIMITER.items()
                if not dq or now - dq[-1] > RATE_LIMIT_WINDOW
            ]
            for ip in stale:
                del RATE_LIMITER[ip]
            # 若同一窗口内仍有超额伪造 IP，按最早写入顺序淘汰以强制封顶
            while len(RATE_LIMITER) > RATE_LIMIT_MAX_KEYS:
                oldest_ip = next(iter(RATE_LIMITER))
                if oldest_ip == client_ip:
                    break
                del RATE_LIMITER[oldest_ip]
        return True


@app.route("/api/daily-quote", methods=["GET"])
def daily_quote():
    forwarded = (request.headers.get("X-Forwarded-For") or "").split(",")[0].strip()
    client_ip = forwarded or request.remote_addr or "unknown"
    if not _check_rate_limit(client_ip):
        return jsonify({
            "quote": DAILY_QUOTE_FALLBACK,
            "date": _today_str(),
            "error": "rate_limited",
            "isFallback": True,
            "debug": {
                "stage": "gateway",
                "error": "rate_limited",
                "status": 429,
            },
        }), 429

    today = _today_str()
    with QUOTE_LOCK:
        should_refresh = QUOTE_CACHE["date"] != today or QUOTE_CACHE["is_fallback"]
        if should_refresh:
            quote, is_fallback, debug = _call_quote_api(today)
            QUOTE_CACHE["quote"] = quote
            QUOTE_CACHE["is_fallback"] = is_fallback
            QUOTE_CACHE["date"] = today
            QUOTE_CACHE["debug"] = debug

        quote = QUOTE_CACHE["quote"] or DAILY_QUOTE_FALLBACK
        is_fallback = QUOTE_CACHE["is_fallback"]
        debug = (QUOTE_CACHE.get("debug") or {}) if is_fallback else {}

    return jsonify({"quote": quote, "date": today, "isFallback": is_fallback, "debug": debug})


@app.route("/api/time-sync", methods=["GET"])
def time_sync():
    req_start = time.monotonic()
    tz_name = (request.args.get("tz") or "Etc/UTC").strip()
    try:
        ZoneInfo(tz_name)
    except Exception:
        return jsonify({"error": "invalid_timezone", "timezone": tz_name}), 400

    # NTP 授时规则：
    # - 使用 UDP 123 端口发送 48 字节请求包，首字节设置为 0x1B（LI=0,VN=3,Mode=3 client）
    # - 服务端回包中的 transmit timestamp（字节 40-47）是自 1900-01-01 起的时间戳
    # - 需减去 NTP 与 Unix 纪元偏移量 2208988800 秒，并以收发中点估算往返延迟
    ntp_epoch_offset = 2208988800
    try:
        ntp_addr = socket.gethostbyname(NTP_SERVER)
        packet = b"\x1b" + 47 * b"\0"
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.settimeout(NTP_TIMEOUT_SEC)
            t0 = time.time()
            s.sendto(packet, (ntp_addr, NTP_PORT))
            data, _ = s.recvfrom(48)
            t1 = time.time()

        if len(data) < 48 or data[1] == 0:
            raise ValueError("invalid_ntp_packet")

        seconds = int.from_bytes(data[40:44], "big")
        fraction = int.from_bytes(data[44:48], "big")
        if seconds < ntp_epoch_offset:
            raise ValueError("invalid_ntp_timestamp")

        unix_seconds = seconds - ntp_epoch_offset
        remote_utc_ms = int(unix_seconds * 1000 + (fraction * 1000 / 2**32))
        local_mid_ms = int(((t0 + t1) / 2) * 1000)
        offset_ms = remote_utc_ms - local_mid_ms
        server_now_ms = int(time.time() * 1000) + offset_ms
        processing_ms = int((time.monotonic() - req_start) * 1000)

        return jsonify(
            {
                "serverTimeMs": server_now_ms,
                "localTimeMs": local_mid_ms,
                "offsetMs": offset_ms,
                "processingMs": processing_ms,
                "timezone": tz_name,
                "source": f"ntp://{NTP_SERVER}:{NTP_PORT}",
                "isFallback": False,
            }
        )
    except (socket.timeout, OSError, ValueError):
        # 公共授时源不可用时自动回退到本地时间，保证页面仍可运行。
        local_utc_ms = int(time.time() * 1000)
        processing_ms = int((time.monotonic() - req_start) * 1000)
        return jsonify(
            {
                "serverTimeMs": local_utc_ms,
                "localTimeMs": local_utc_ms,
                "offsetMs": 0,
                "processingMs": processing_ms,
                "timezone": tz_name,
                "source": "local-fallback",
                "isFallback": True,
            }
        )


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)
