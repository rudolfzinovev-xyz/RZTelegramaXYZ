"""
RZTelegramaXYZ Python bot library
=================================

Minimal long-poll client for the RZTelegramaXYZ bot HTTP API.

Quick start
-----------

    from rztelegrama_bot import Bot

    bot = Bot(token="rzbt_...", api_url="https://your-host.example/api")

    @bot.on_message
    def handle(msg, send):
        if msg.text == "/ping":
            send(msg.from_user_id, "pong")

    bot.run()  # blocks; long-polls forever

API
---
- ``Bot(token, api_url, poll_interval=2.0)`` — create a bot client.
- ``bot.send_message(receiver_id, text)`` — send a plaintext message.
- ``bot.get_updates(offset=None, limit=100)`` — pull a batch (used internally).
- ``@bot.on_message`` — register a handler ``handler(message, send)``.
- ``bot.run(reset_offset=False)`` — long-poll loop. Pass
  ``reset_offset=True`` once to ignore the backlog and only react to
  messages received after start.

Notes
-----
* Messages with bots are NOT end-to-end encrypted. The server stores them
  plaintext. Don't put secrets in bot conversations.
* The bot's "phone" is a synthetic ``bot:<random>`` value — don't expose
  it to users; route everything through the bot book.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
import logging
from dataclasses import dataclass
from typing import Callable, Optional, Any
import urllib.parse
import urllib.request
import json


log = logging.getLogger("rztelegrama_bot")


def env_or_arg(default_env_token: str = "RZ_BOT_TOKEN", default_env_api: str = "RZ_API_URL"):
    """Parse CLI args + env vars and return (token, api_url).

    Precedence: --token / --api CLI flags > env vars > error.

    This is what the bot scripts call so a single repo with N bot scripts
    can be launched from PM2/systemd/whatever, each with its own
    --token / --api, without per-bot env-var renaming gymnastics.

    Example:
        python moderator_bot.py --token rzbt_xxx --api https://host/api
    """
    p = argparse.ArgumentParser(add_help=False)
    p.add_argument("--token", default=os.environ.get(default_env_token))
    p.add_argument("--api",   default=os.environ.get(default_env_api, "http://localhost:3000/api"))
    args, _rest = p.parse_known_args()
    if not args.token:
        sys.stderr.write(
            "Bot token missing. Pass --token rzbt_... or set "
            f"{default_env_token} env var.\n"
        )
        sys.exit(2)
    return args.token, args.api


@dataclass
class FromUser:
    id: str
    name: str
    username: str
    phone: str


@dataclass
class Message:
    id: str
    text: str
    date: str
    from_user: FromUser

    @property
    def from_user_id(self) -> str:
        return self.from_user.id


class BotError(Exception):
    pass


class Bot:
    def __init__(self, token: str, api_url: str, poll_interval: float = 2.0, timeout: float = 30.0):
        if not token or not token.startswith("rzbt_"):
            raise ValueError("token must be a bot token starting with 'rzbt_'")
        self.token = token
        self.api_url = api_url.rstrip("/")
        self.poll_interval = poll_interval
        self.timeout = timeout
        self._handler: Optional[Callable[[Message, Callable[[str, str], Any]], None]] = None
        self._offset: Optional[str] = None

    # ── Handlers ───────────────────────────────────────────────────────
    def on_message(self, fn: Callable[[Message, Callable[[str, str], Any]], None]):
        """Decorator/setter for the message handler.

        The handler receives ``(message, send)`` where ``send(receiver_id, text)``
        is a convenience helper for ``self.send_message``.
        """
        self._handler = fn
        return fn

    # ── HTTP helpers ───────────────────────────────────────────────────
    def _request(self, method: str, path: str, *, query: dict | None = None, body: dict | None = None) -> dict:
        url = self.api_url + path
        if query:
            url += "?" + urllib.parse.urlencode({k: v for k, v in query.items() if v is not None})
        data = None
        headers = {"Authorization": f"Bearer {self.token}", "Accept": "application/json"}
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            try:
                err = json.loads(e.read().decode("utf-8"))
            except Exception:
                err = {"error": e.reason}
            raise BotError(f"{method} {path} → HTTP {e.code}: {err}") from e

    # ── Public API ─────────────────────────────────────────────────────
    def send_message(self, receiver_id: str, text: str) -> dict:
        return self._request("POST", "/bot/sendMessage", body={"receiverId": receiver_id, "text": text})

    def get_updates(self, offset: Optional[str] = None, limit: int = 100) -> dict:
        return self._request("GET", "/bot/getUpdates", query={"offset": offset, "limit": limit})

    # ── Run loop ───────────────────────────────────────────────────────
    def run(self, reset_offset: bool = False) -> None:
        """Long-poll forever. Calls the registered ``on_message`` handler.

        If ``reset_offset`` is True, all messages already in the inbox
        are skipped — only new ones (after start) trigger the handler.
        """
        if not self._handler:
            raise RuntimeError("No handler registered. Use @bot.on_message before run().")

        if reset_offset:
            data = self.get_updates(offset=None, limit=500)
            msgs = data.get("messages", [])
            if msgs:
                self._offset = msgs[-1]["id"]
            log.info("Reset offset; skipping %d existing messages", len(msgs))

        bot = data.get("bot") if reset_offset else None
        if bot:
            log.info("Running as @%s (%s)", bot.get("username"), bot.get("name"))

        while True:
            try:
                data = self.get_updates(offset=self._offset, limit=100)
                messages = data.get("messages", [])
                if not messages:
                    time.sleep(self.poll_interval)
                    continue
                for raw in messages:
                    msg = _parse_message(raw)
                    self._offset = msg.id
                    try:
                        self._handler(msg, self.send_message)
                    except Exception:
                        log.exception("handler raised on message %s", msg.id)
            except BotError:
                log.exception("API call failed; backing off")
                time.sleep(self.poll_interval * 3)
            except KeyboardInterrupt:
                log.info("Stopped by user")
                return
            except Exception:
                log.exception("Unexpected error; backing off")
                time.sleep(self.poll_interval * 3)


def _parse_message(raw: dict) -> Message:
    f = raw.get("from") or {}
    return Message(
        id=raw["id"],
        text=raw.get("text", ""),
        date=raw.get("date", ""),
        from_user=FromUser(
            id=f.get("id", ""),
            name=f.get("name", ""),
            username=f.get("username", ""),
            phone=f.get("phone", ""),
        ),
    )
