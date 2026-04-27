import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("8") && digits.length === 11) return "+7" + digits.slice(1);
  if (digits.length >= 10) return "+" + digits;
  return raw;
}

// GET /api/users — all users (exclude ?exclude=id)
// GET /api/users?phone=xxx — lookup by phone (normalized)
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("phone");
  const exclude = req.nextUrl.searchParams.get("exclude");

  if (raw) {
    const phone = normalizePhone(raw);
    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, name: true, username: true, phone: true, timezone: true, line: true, bio: true, publicKey: true },
    });
    if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(user);
  }

  const users = await prisma.user.findMany({
    where: exclude ? { id: { not: exclude } } : undefined,
    select: { id: true, name: true, username: true, phone: true, timezone: true, line: true, bio: true, publicKey: true },
    orderBy: { name: "asc" },
  });

  // Mark contacts saved by the current user so the UI can show the
  // red-pencil "this is in your contacts book" marker.
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const saved = await prisma.contact.findMany({
      where: { ownerId: session.user.id },
      select: { contactId: true },
    });
    const savedSet = new Set(saved.map(s => s.contactId));
    return NextResponse.json(users.map(u => ({ ...u, isContact: savedSet.has(u.id) })));
  }
  return NextResponse.json(users.map(u => ({ ...u, isContact: false })));
}

// POST /api/users — register
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    username, name, phone: rawPhone, password, timezone,
    publicKey, encryptedPrivateKey, privateKeyNonce, privateKeySalt,
  } = body;

  if (!username || !name || !rawPhone || !password || !timezone) {
    return NextResponse.json({ error: "all fields required" }, { status: 400 });
  }

  if (!publicKey || !encryptedPrivateKey || !privateKeyNonce || !privateKeySalt) {
    return NextResponse.json({ error: "encryption keys required" }, { status: 400 });
  }

  if (typeof password !== "string" || password.length < 8 || password.length > 256) {
    return NextResponse.json({ error: "Пароль: 8–256 символов" }, { status: 400 });
  }

  if (typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
    return NextResponse.json({ error: "Некорректное имя" }, { status: 400 });
  }

  if (!/^UTC[+-]\d{1,2}$/.test(timezone)) {
    return NextResponse.json({ error: "Некорректный часовой пояс" }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    return NextResponse.json(
      { error: "Юзернейм: 3–30 символов, только латиница, цифры и _" },
      { status: 400 }
    );
  }

  const phone = normalizePhone(rawPhone);

  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    return NextResponse.json({ error: "Юзернейм уже занят" }, { status: 409 });
  }

  const existingPhone = await prisma.user.findUnique({ where: { phone } });
  if (existingPhone) {
    return NextResponse.json({ error: "Телефон уже зарегистрирован" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  // Line is assigned randomly on server; clients never choose it.
  const line = Math.floor(Math.random() * 6) + 1;
  const user = await prisma.user.create({
    data: {
      username, name, phone, passwordHash, timezone, line,
      publicKey, encryptedPrivateKey, privateKeyNonce, privateKeySalt,
    },
    select: { id: true, username: true, name: true, phone: true, timezone: true, line: true },
  });

  return NextResponse.json(user, { status: 201 });
}
