import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/me/keys — returns own encrypted privkey blob for client-side decryption.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      publicKey: true,
      encryptedPrivateKey: true,
      privateKeyNonce: true,
      privateKeySalt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(user);
}

// PUT /api/me/keys — generate+store keys for existing accounts without them.
// Client generates keypair, encrypts privkey with password, sends us the blobs.
// Server verifies password (bcrypt) before accepting.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { password, publicKey, encryptedPrivateKey, privateKeyNonce, privateKeySalt } = await req.json();
  if (!password || !publicKey || !encryptedPrivateKey || !privateKeyNonce || !privateKeySalt) {
    return NextResponse.json({ error: "all fields required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "wrong password" }, { status: 403 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { publicKey, encryptedPrivateKey, privateKeyNonce, privateKeySalt },
  });
  return NextResponse.json({ ok: true });
}
