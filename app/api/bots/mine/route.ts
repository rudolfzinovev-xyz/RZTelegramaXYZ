import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/bots/mine — bots owned by the current user.
// Token is NOT returned here on purpose — only on creation/regenerate.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const bots = await prisma.user.findMany({
    where: { isBot: true, botOwnerId: session.user.id },
    select: {
      id: true, name: true, username: true, phone: true, timezone: true, line: true,
      bio: true, isBot: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bots);
}
