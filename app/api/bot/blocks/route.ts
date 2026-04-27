import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveBotFromAuth } from "@/lib/botAuth";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("8") && digits.length === 11) return "+7" + digits.slice(1);
  if (digits.length >= 10) return "+" + digits;
  return raw;
}

// Any bot can act as a moderation interface — blocks are per-user
// (block-list belongs to the initiator, not the bot). To prevent a
// malicious bot from blocking on behalf of arbitrary users, we require
// that the initiator has actually messaged this bot at least once
// (i.e. the user willingly opened a channel to it).
async function requireBotAndInitiatorContact(req: NextRequest, initiatorId: string) {
  const bot = await resolveBotFromAuth(req.headers.get("authorization"));
  if (!bot) return { error: "unauthorized", code: 401 as const, bot: null };
  const everSent = await prisma.message.findFirst({
    where: { senderId: initiatorId, receiverId: bot.botId },
    select: { id: true },
  });
  if (!everSent) {
    return { error: "initiator has never messaged this bot", code: 403 as const, bot: null };
  }
  return { error: null, code: 200 as const, bot };
}

// POST /api/bot/blocks
// Headers: Authorization: Bearer <admin bot token>
// Body: { initiatorId: string, targetPhone: string, action: "block" | "unblock" }
//
// initiatorId is the user who sent the command to the bot. The bot acts
// on their behalf — adds/removes a Block row where blockerId=initiatorId.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { initiatorId, targetPhone, action } = body || {};

  if (typeof initiatorId !== "string" || !initiatorId) {
    return NextResponse.json({ error: "initiatorId required" }, { status: 400 });
  }
  if (typeof targetPhone !== "string" || !targetPhone) {
    return NextResponse.json({ error: "targetPhone required" }, { status: 400 });
  }
  if (action !== "block" && action !== "unblock") {
    return NextResponse.json({ error: "action must be 'block' or 'unblock'" }, { status: 400 });
  }

  const auth = await requireBotAndInitiatorContact(req, initiatorId);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.code });

  const initiator = await prisma.user.findUnique({
    where: { id: initiatorId },
    select: { id: true, isBot: true },
  });
  if (!initiator || initiator.isBot) {
    return NextResponse.json({ error: "initiator not found" }, { status: 404 });
  }

  const phone = normalizePhone(targetPhone);
  const target = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, isBot: true, name: true, phone: true },
  });
  if (!target) return NextResponse.json({ error: "Абонент с таким номером не найден" }, { status: 404 });
  if (target.isBot) return NextResponse.json({ error: "Нельзя блокировать ботов" }, { status: 400 });
  if (target.id === initiatorId) return NextResponse.json({ error: "Нельзя блокировать самого себя" }, { status: 400 });

  if (action === "block") {
    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: initiatorId, blockedId: target.id } },
      update: {},
      create: { blockerId: initiatorId, blockedId: target.id },
    });
  } else {
    await prisma.block.deleteMany({
      where: { blockerId: initiatorId, blockedId: target.id },
    });
  }

  return NextResponse.json({ ok: true, action, target: { id: target.id, name: target.name, phone: target.phone } });
}

// GET /api/bot/blocks?initiatorId=...
// Returns the initiator's block list so the bot can render /list etc.
export async function GET(req: NextRequest) {
  const initiatorId = req.nextUrl.searchParams.get("initiatorId");
  if (!initiatorId) return NextResponse.json({ error: "initiatorId required" }, { status: 400 });

  const auth = await requireBotAndInitiatorContact(req, initiatorId);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.code });

  const blocks = await prisma.block.findMany({
    where: { blockerId: initiatorId },
    include: { blocked: { select: { id: true, name: true, phone: true, username: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    blocks: blocks.map(b => ({
      id: b.blocked.id,
      name: b.blocked.name,
      phone: b.blocked.phone,
      username: b.blocked.username,
      createdAt: b.createdAt,
    })),
  });
}
