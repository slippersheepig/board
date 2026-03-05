import json
import os
import threading
import time
from collections import defaultdict, deque
from datetime import datetime
from zoneinfo import ZoneInfo
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen

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

RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 30
RATE_LIMITER = defaultdict(deque)
RATE_LIMIT_LOCK = threading.Lock()


@app.route("/")
def index():
    return render_template("index.html")


def _today_str() -> str:
    now = datetime.now(ZoneInfo("Asia/Shanghai"))
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
        },
    )

    try:
        with urlopen(req, timeout=8) as resp:
            status_code = getattr(resp, "status", None)
            raw_text = resp.read().decode("utf-8", errors="replace")
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
        err_body = err.read().decode("utf-8", errors="replace")
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
            "status": 200,
            "detail": str(err),
        }
    except TimeoutError:
        return DAILY_QUOTE_FALLBACK, True, {
            "stage": "request",
            "error": "timeout",
        }
    except URLError as err:
        return DAILY_QUOTE_FALLBACK, True, {
            "stage": "request",
            "error": "url_error",
            "detail": str(err.reason),
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
        return True


@app.route("/api/daily-quote", methods=["GET"])
def daily_quote():
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
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
        debug = QUOTE_CACHE.get("debug") or {}

    return jsonify({"quote": quote, "date": today, "isFallback": is_fallback, "debug": debug})


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)
