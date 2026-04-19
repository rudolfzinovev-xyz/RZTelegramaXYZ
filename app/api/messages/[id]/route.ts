import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/messages/:id — assign to folder (only receiver may file, only into own folders)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { folderId } = await req.json();

  const message = await prisma.message.findUnique({ where: { id }, select: { receiverId: true } });
  if (!message || message.receiverId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (folderId) {
    const folder = await prisma.folder.findUnique({ where: { id: folderId }, select: { ownerId: true } });
    if (!folder || folder.ownerId !== session.user.id) {
      return NextResponse.json({ error: "folder not found" }, { status: 404 });
    }
  }

  const updated = await prisma.message.update({
    where: { id },
    data: { folderId: folderId ?? null },
  });
  return NextResponse.json(updated);
}

// DELETE /api/messages/:id — permanently delete
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Only allow deleting own received messages
  await prisma.message.deleteMany({
    where: { id, receiverId: session.user.id },
  });
  return NextResponse.json({ ok: true });
}
