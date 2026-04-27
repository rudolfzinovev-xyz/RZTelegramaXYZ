import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/contacts — return all of the current user's saved contacts
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await prisma.contact.findMany({
    where: { ownerId: session.user.id },
    include: {
      contact: {
        select: { id: true, name: true, username: true, phone: true, timezone: true, line: true, publicKey: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rows.map(r => r.contact));
}

// POST /api/contacts — body: { contactId }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const contactId: string | undefined = body?.contactId;
  if (!contactId || typeof contactId !== "string") {
    return NextResponse.json({ error: "contactId required" }, { status: 400 });
  }
  if (contactId === session.user.id) {
    return NextResponse.json({ error: "cannot add self" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: contactId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });

  await prisma.contact.upsert({
    where: { ownerId_contactId: { ownerId: session.user.id, contactId } },
    update: {},
    create: { ownerId: session.user.id, contactId },
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/contacts?contactId=xxx
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const contactId = req.nextUrl.searchParams.get("contactId");
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  await prisma.contact.deleteMany({
    where: { ownerId: session.user.id, contactId },
  });

  return NextResponse.json({ ok: true });
}
