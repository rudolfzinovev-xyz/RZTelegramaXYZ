import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function genToken(): string {
  return "rzbt_" + crypto.randomBytes(32).toString("base64url");
}

// POST /api/bots/:id/regenerate — rotate the bot's API token
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const bot = await prisma.user.findUnique({
    where: { id },
    select: { isBot: true, botOwnerId: true },
  });
  if (!bot || !bot.isBot) return NextResponse.json({ error: "bot not found" }, { status: 404 });
  if (bot.botOwnerId !== session.user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const token = genToken();
  await prisma.botToken.upsert({
    where: { botId: id },
    update: { token },
    create: { botId: id, token },
  });

  return NextResponse.json({ token });
}
