import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BIO_MAX = 50;

// PATCH /api/users/me — body: { bio: string | null }
// Only the bio field is editable here. Empty string clears it.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const rawBio = body.bio;
  if (rawBio !== null && typeof rawBio !== "string") {
    return NextResponse.json({ error: "bio must be string or null" }, { status: 400 });
  }

  const trimmed = typeof rawBio === "string" ? rawBio.trim() : "";
  if (trimmed.length > BIO_MAX) {
    return NextResponse.json({ error: `bio max ${BIO_MAX} chars` }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { bio: trimmed.length === 0 ? null : trimmed },
    select: { id: true, name: true, username: true, phone: true, timezone: true, line: true, bio: true },
  });

  return NextResponse.json(user);
}
