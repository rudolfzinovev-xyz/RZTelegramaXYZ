import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveBotFromAuth } from "@/lib/botAuth";

// GET /api/bot/getUpdates?offset=<lastMessageId>&limit=100
// Returns messages addressed to this bot with id > offset.
// Plain HTTP polling — keep it simple, easy to consume from any language.
export async function GET(req: NextRequest) {
  const bot = await resolveBotFromAuth(req.headers.get("authorization"));
  if (!bot) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const offset = req.nextUrl.searchParams.get("offset");
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitRaw || "100", 10) || 100, 1), 500);

  const where: any = { receiverId: bot.botId };
  if (offset) {
    const cursorMsg = await prisma.message.findUnique({
      where: { id: offset },
      select: { createdAt: true, id: true },
    });
    if (cursorMsg) {
      where.OR = [
        { createdAt: { gt: cursorMsg.createdAt } },
        { createdAt: cursorMsg.createdAt, id: { gt: cursorMsg.id } },
      ];
    }
  }

  const messages = await prisma.message.findMany({
    where,
    include: {
      sender: { select: { id: true, name: true, username: true, phone: true } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit,
  });

  return NextResponse.json({
    bot: { id: bot.botId, name: bot.name, username: bot.username },
    messages: messages.map(m => ({
      id: m.id,
      from: m.sender,
      text: m.content,
      date: m.createdAt,
    })),
  });
}
