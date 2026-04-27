import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/bots/:id — delete a bot owned by the current user
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const bot = await prisma.user.findUnique({
    where: { id },
    select: { isBot: true, botOwnerId: true },
  });
  if (!bot || !bot.isBot) return NextResponse.json({ error: "bot not found" }, { status: 404 });
  if (bot.botOwnerId !== session.user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
