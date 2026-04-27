# RZTelegramaXYZ Bot Infrastructure

## Concept

A bot is a regular `User` row with `isBot=true`. It has no password (cannot
log in via the UI), no encryption keys (messages with bots are plaintext),
and its line is fixed at `0` (the service line). Each bot has exactly one
API token in the `BotToken` table; the bot owner can rotate it.

Because bots are users, every existing piece of infrastructure already
works with them: socket routing, message storage, contact book listings,
push notifications. The only client-side adjustments are:

* `tryDecrypt` returns the message body verbatim when `nonce=null`
  (the marker for plaintext bot messages).
* The compose UI sends `nonce: null` whenever the recipient is a bot
  (`recipient.isBot`).

The frontend exposes bots in three places:

* **Книга ботов** — third book on the desk + third toggle in the mobile
  Contacts tab. Lists every bot in the system, message-only (no calls).
* **Служебный коммутатор** — second mode in the teletype switchboard
  with sockets `0..6`. Line `0` is reserved for bots.
* **Bot management** — own bots are managed from the More tab on mobile
  and the desktop top-bar (TODO).

## HTTP API

### Owner-side (NextAuth session, browser cookies)

| Method | Path                            | Body                       | Notes                                                |
|--------|---------------------------------|----------------------------|------------------------------------------------------|
| GET    | `/api/bots`                     | —                          | Public list of every bot (for the bot book).         |
| GET    | `/api/bots/mine`                | —                          | Bots owned by the current user. Token NOT returned.  |
| POST   | `/api/bots`                     | `{ username, name, bio? }` | Creates a bot, returns one-time `token`.             |
| DELETE | `/api/bots/:id`                 | —                          | Delete an owned bot.                                 |
| POST   | `/api/bots/:id/regenerate`      | —                          | Issue a new token, invalidate the old one.           |

### Runtime API (bot token, `Authorization: Bearer rzbt_...`)

| Method | Path                                     | Body                                            | Notes                                              |
|--------|------------------------------------------|-------------------------------------------------|----------------------------------------------------|
| GET    | `/api/bot/getUpdates?offset=&limit=`     | —                                               | Returns messages addressed to the bot, oldest-first. Pass the last seen `id` as `offset`. |
| POST   | `/api/bot/sendMessage`                   | `{ receiverId, text }`                          | Sends plaintext message from the bot to `receiverId`. |
| POST   | `/api/bot/blocks`                        | `{ initiatorId, targetPhone, action }`          | `action: "block" | "unblock"`. Bot acts on behalf of `initiatorId`; the API requires that `initiatorId` has messaged this bot at least once (so a malicious bot can't block on behalf of arbitrary users). 403 if the receiver has blocked the bot. |
| GET    | `/api/bot/blocks?initiatorId=`           | —                                               | Returns the initiator's current block list.       |

### Blocks: system-level enforcement

Block lists are **per-user** — each block belongs to the initiator, not
to the bot. When user A blocks user B:

* `POST /api/messages` from B → A returns **403 "Получатель не принимает
  сообщения от вас"**.
* `socket.emit("call:initiate")` from B to A is dropped silently
  (caller times out as if A were offline — no leak of block state).
* `POST /api/bot/sendMessage` from any bot to A: also dropped if A
  blocked that bot.

Bots cannot be blocked-on-behalf-of unless the user has talked to the
bot first. See `bot-lib/python/moderator_bot.py` for a worked example
exposing `/help`, `/block <phone>`, `/unblock <phone>`, `/list`.

`getUpdates` is plain HTTP polling — no websockets needed by the bot.
The default Python lib polls every 2 s.

### Internal hop (server-only)

When `/api/bot/sendMessage` succeeds, it POSTs `{ messageId }` to
`/__internal/bot-message` (handled inside `server.js`) with header
`X-Internal-Secret: $INTERNAL_HOOK_SECRET`. The Socket.io layer then
emits `message:receive` to the recipient's socket and fires a push.
Without `INTERNAL_HOOK_SECRET` set, delivery still works but only on
the recipient's next reconnect/visibility-change re-sync.

Required env:

    INTERNAL_HOOK_SECRET=<any random string, same on Next + server.js>

## Python lib

See `bot-lib/python/rztelegrama_bot.py`. Stdlib only — no deps.

```python
from rztelegrama_bot import Bot

bot = Bot(token="rzbt_...", api_url="https://your-host/api")

@bot.on_message
def handle(msg, send):
    if msg.text == "/ping":
        send(msg.from_user_id, "pong")

bot.run(reset_offset=True)
```

`reset_offset=True` skips the backlog on first start so the bot only
reacts to new messages.

## Building bots in other languages

The HTTP API is small enough that any language with `requests`/`fetch`
works. The minimum:

1. `GET /api/bot/getUpdates?offset=<lastId>` with the bearer token →
   list of `{ id, from: {id, name, username, phone}, text, date }`.
2. Process each message, remember the last `id` as the new offset.
3. `POST /api/bot/sendMessage` with `{ receiverId, text }` to reply.
4. Sleep 2-5 s, repeat.
