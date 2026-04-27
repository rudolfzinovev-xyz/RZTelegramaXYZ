import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveBotFromAuth } from "@/lib/botAuth";

// POST /api/bot/sendMessage
// Headers: Authorization: Bearer <token>
// Body: { receiverId: string, text: string }
//
// Creates a plaintext message from the bot to the receiver and returns
// the saved row. The HTTP server doesn't push the socket event itself
// (Next API routes don't share the socket.io instance with server.js);
// we publish a Postgres NOTIFY-style hop instead by writing to the DB —
// the Socket.io server in server.js will need to forward bot messages
// based on a poll/notification. For now, the receiver's client picks up
// the message on next syncOfflineMessages() call (visibility/reconnect).
//
// If you want instant delivery, run server.js with this same Prisma
// client and add a small "internal hook" — see TODO at bottom.
export async function POST(req: NextRequest) {
  const bot = await resolveBotFromAuth(req.headers.get("authorization"));
  if (!bot) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { receiverId, text } = body || {};

  if (typeof receiverId !== "string" || !receiverId) {
    return NextResponse.json({ error: "receiverId required" }, { status: 400 });
  }
  if (typeof text !== "string" || text.length === 0 || text.length > 16384) {
    return NextResponse.json({ error: "text required (max 16384 chars)" }, { status: 400 });
  }

  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { id: true, isBot: true },
  });
  if (!receiver) return NextResponse.json({ error: "receiver not found" }, { status: 404 });

  const message = await prisma.message.create({
    data: {
      content: text,
      nonce: null,                 // plaintext from bot
      senderId: bot.botId,
      receiverId,
    },
    select: { id: true, content: true, createdAt: true, senderId: true, receiverId: true },
  });

  // Best-effort socket push via internal HTTP hook on the same process.
  // server.js exposes /__internal/bot-message which the socket layer
  // forwards as a normal `message:receive` to the recipient.
  // In dev the secret is optional; in production server.js will reject
  // a hook call without a matching secret.
  const internalUrl =
    process.env.INTERNAL_HOOK_URL ||
    "http://127.0.0.1:" + (process.env.PORT || 3000) + "/__internal/bot-message";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.INTERNAL_HOOK_SECRET) {
    headers["X-Internal-Secret"] = process.env.INTERNAL_HOOK_SECRET;
  }
  fetch(internalUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ messageId: message.id }),
  }).catch(() => { /* fall back to DB-only delivery */ });

  return NextResponse.json({ ok: true, message });
}
