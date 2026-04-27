import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBlocked } from "@/lib/blocks";

// GET /api/messages?with=userId — conversation history
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const withUserId = req.nextUrl.searchParams.get("with");
  if (!withUserId) {
    // return all received messages not yet in a folder
    const messages = await prisma.message.findMany({
      where: { receiverId: session.user.id, folderId: null },
      include: { sender: { select: { id: true, name: true, phone: true, timezone: true, line: true, publicKey: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(messages);
  }

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: session.user.id, receiverId: withUserId },
        { senderId: withUserId, receiverId: session.user.id },
      ],
    },
    include: {
      sender: { select: { id: true, name: true, phone: true, timezone: true, line: true, publicKey: true } },
      receiver: { select: { id: true, name: true, phone: true, publicKey: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}

// POST /api/messages — save sent message
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { receiverId, content, nonce } = await req.json();
  // nonce can be null when the recipient is a bot (no E2E for bots).
  if (typeof receiverId !== "string" || typeof content !== "string") {
    return NextResponse.json({ error: "receiverId and content required" }, { status: 400 });
  }
  if (nonce !== null && typeof nonce !== "string") {
    return NextResponse.json({ error: "nonce must be string or null" }, { status: 400 });
  }
  if (content.length === 0 || content.length > 16384) {
    return NextResponse.json({ error: "invalid content length" }, { status: 400 });
  }
  if (receiverId === session.user.id) {
    return NextResponse.json({ error: "cannot send to self" }, { status: 400 });
  }

  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { id: true, isBot: true },
  });
  if (!receiver) return NextResponse.json({ error: "receiver not found" }, { status: 404 });

  // Bot conversations are plaintext by design — reject ciphertext to bots
  // (no one would be able to decrypt it) and require plaintext to bots.
  if (receiver.isBot && nonce !== null) {
    return NextResponse.json({ error: "messages to bots must be plaintext (nonce=null)" }, { status: 400 });
  }
  if (!receiver.isBot && nonce === null) {
    return NextResponse.json({ error: "messages to users must be encrypted (nonce required)" }, { status: 400 });
  }

  // Receiver has blocked the sender → silently 403 so the sender knows
  // their message did not land. (Doesn't leak whether they're blocked or
  // simply offline — same status as a generic "not delivered".)
  if (await isBlocked(session.user.id, receiverId)) {
    return NextResponse.json({ error: "Получатель не принимает сообщения от вас" }, { status: 403 });
  }

  const message = await prisma.message.create({
    data: { senderId: session.user.id, receiverId, content, nonce },
    include: {
      sender: { select: { id: true, name: true, phone: true, timezone: true, line: true, publicKey: true } },
      receiver: { select: { id: true, name: true, phone: true, publicKey: true } },
    },
  });

  return NextResponse.json(message, { status: 201 });
}
