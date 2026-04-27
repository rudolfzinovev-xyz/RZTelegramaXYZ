"""
Echo bot example.

Run any of:
    python example_echo.py --token rzbt_... --api https://host/api
    RZ_BOT_TOKEN=rzbt_... python example_echo.py
"""

import logging
from rztelegrama_bot import Bot, env_or_arg

logging.basicConfig(level=logging.INFO)

token, api = env_or_arg()
bot = Bot(token=token, api_url=api)


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
