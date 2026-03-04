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


def _extract_quote(response_data: dict) -> str:
    choices = response_data.get("choices") or []
    if not choices:
        return DAILY_QUOTE_FALLBACK
    message = (choices[0] or {}).get("message") or {}
    content = (message.get("content") or "").strip()
    return content or DAILY_QUOTE_FALLBACK


def _call_quote_api(today: str) -> str:
    api_key = os.environ.get("DAILY_QUOTE_API_KEY", "")
    api_url = os.environ.get("DAILY_QUOTE_API_URL", "")
    model_name = os.environ.get("DAILY_QUOTE_MODEL", "")

    if not api_key or not api_url or not model_name:
        return DAILY_QUOTE_FALLBACK

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
            data = json.loads(resp.read().decode("utf-8"))
            return _extract_quote(data)
    except (URLError, HTTPError, TimeoutError, json.JSONDecodeError):
        return DAILY_QUOTE_FALLBACK


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
        return jsonify({"quote": DAILY_QUOTE_FALLBACK, "date": _today_str(), "error": "rate_limited"}), 429

    today = _today_str()
    with QUOTE_LOCK:
        if QUOTE_CACHE["date"] != today:
            QUOTE_CACHE["quote"] = _call_quote_api(today)
            QUOTE_CACHE["date"] = today

        quote = QUOTE_CACHE["quote"] or DAILY_QUOTE_FALLBACK

    return jsonify({"quote": quote, "date": today})


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)
