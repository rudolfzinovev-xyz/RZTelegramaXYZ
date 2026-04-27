"""
Moderator bot — exposes /help, /block <phone>, /unblock <phone> commands
so users can manage their personal block list by talking to a bot.

Each user's block list is private and applies only to *their* incoming
messages and calls — the bot just acts as a UI for the per-user setting.

Setup
-----
    export RZ_BOT_TOKEN=rzbt_...
    export RZ_API_URL=https://your-host.example/api
    python moderator_bot.py
"""

import os
import logging
import urllib.parse
import urllib.request
import urllib.error
import json

from rztelegrama_bot import Bot, Message, BotError

logging.basicConfig(level=logging.INFO)

API_URL = os.environ.get("RZ_API_URL", "http://localhost:3000/api")
TOKEN = os.environ["RZ_BOT_TOKEN"]

bot = Bot(token=TOKEN, api_url=API_URL)


HELP_TEXT = (
    "Привет! Я — модератор. Помогаю не получать спам.\n"
    "\n"
    "Команды:\n"
    "  /help — это сообщение\n"
    "  /block <телефон> — больше не получать сообщения и звонки от этого абонента\n"
    "  /unblock <телефон> — снять блокировку\n"
    "  /list — показать кого ты заблокировал\n"
    "\n"
    "Пример: /block +77001234567\n"
    "Список ведётся для тебя лично, никто другой его не видит."
)


def call_api(method: str, path: str, *, query: dict | None = None, body: dict | None = None) -> dict:
    """Helper for the bot's own admin endpoints (uses the same bearer token)."""
    url = API_URL.rstrip("/") + path
    if query:
        url += "?" + urllib.parse.urlencode({k: v for k, v in query.items() if v is not None})
    data = None
    headers = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            err = json.loads(e.read().decode("utf-8"))
            raise BotError(err.get("error") or f"HTTP {e.code}")
        except BotError:
            raise
        except Exception:
            raise BotError(f"HTTP {e.code}")


def parse_command(text: str) -> tuple[str, str]:
    text = (text or "").strip()
    if not text.startswith("/"):
        return "", ""
    parts = text.split(maxsplit=1)
    return parts[0].lower(), (parts[1].strip() if len(parts) > 1 else "")


@bot.on_message
def handle(msg: Message, send):
    cmd, arg = parse_command(msg.text)

    if cmd == "/start" or cmd == "/help" or not cmd:
        send(msg.from_user_id, HELP_TEXT)
        return

    if cmd == "/list":
        try:
            data = call_api("GET", "/bot/blocks", query={"initiatorId": msg.from_user_id})
            blocks = data.get("blocks", [])
            if not blocks:
                send(msg.from_user_id, "Список блокировок пуст.")
                return
            lines = ["Твой список блокировок:"]
            for b in blocks:
                lines.append(f"  • {b['name']} ({b['phone']})")
            send(msg.from_user_id, "\n".join(lines))
        except BotError as e:
            send(msg.from_user_id, f"Не получилось: {e}")
        return

    if cmd in ("/block", "/unblock"):
        if not arg:
            send(msg.from_user_id, f"Укажите телефон: {cmd} +77001234567")
            return
        # Don't allow blocking yourself even if user typed their own number.
        if arg.replace(" ", "").lstrip("+") == msg.from_user.phone.lstrip("+"):
            send(msg.from_user_id, "Это ваш собственный номер.")
            return

        action = "block" if cmd == "/block" else "unblock"
        try:
            res = call_api(
                "POST", "/bot/blocks",
                body={"initiatorId": msg.from_user_id, "targetPhone": arg, "action": action},
            )
            t = res.get("target") or {}
            who = f"{t.get('name','?')} ({t.get('phone','?')})"
            if action == "block":
                send(msg.from_user_id, f"Заблокирован: {who}\nТы больше не получишь от него ни сообщений, ни звонков.")
            else:
                send(msg.from_user_id, f"Разблокирован: {who}")
        except BotError as e:
            send(msg.from_user_id, f"Не получилось: {e}")
        return

    send(msg.from_user_id, f"Неизвестная команда: {cmd}\nНаберите /help чтобы увидеть список.")


if __name__ == "__main__":
    bot.run(reset_offset=True)
