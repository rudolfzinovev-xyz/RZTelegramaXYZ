"""
Echo bot example.

  $ pip install -e .   # or just put rztelegrama_bot.py next to this file
  $ export RZ_BOT_TOKEN=rzbt_...
  $ export RZ_API_URL=https://your-host.example/api
  $ python example_echo.py
"""

import os
import logging
from rztelegrama_bot import Bot

logging.basicConfig(level=logging.INFO)

bot = Bot(
    token=os.environ["RZ_BOT_TOKEN"],
    api_url=os.environ.get("RZ_API_URL", "http://localhost:3000/api"),
)


@bot.on_message
def handle(msg, send):
    text = msg.text.strip()
    if text == "/start":
        send(msg.from_user_id, f"Привет, {msg.from_user.name}! Я повторяю всё, что мне пишут.")
    elif text == "/ping":
        send(msg.from_user_id, "pong")
    else:
        send(msg.from_user_id, f"Ты написал: {text}")


if __name__ == "__main__":
    # reset_offset=True = ignore the backlog of messages received before
    # the bot started; remove if you want to process them too.
    bot.run(reset_offset=True)
