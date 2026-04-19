import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const folders = await prisma.folder.findMany({
    where: { ownerId: session.user.id },
    include: {
      messages: {
        include: { sender: { select: { id: true, name: true, phone: true, publicKey: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return NextResponse.json(folders);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { label } = await req.json();
  if (typeof label !== "string" || label.trim().length === 0 || label.length > 100) {
    return NextResponse.json({ error: "invalid label" }, { status: 400 });
  }
  const folder = await prisma.folder.upsert({
    where: { ownerId_label: { ownerId: session.user.id, label: label.trim() } },
    update: {},
    create: { ownerId: session.user.id, label: label.trim() },
  });
  return NextResponse.json(folder, { status: 201 });
}
