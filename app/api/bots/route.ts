import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const NAME_MAX = 100;
const BIO_MAX = 50;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

// Admin usernames from env, comma-separated. Only these creators can have
// bots on the service line 0; everyone else gets a random line 1..6.
function isAdminUsername(username: string): boolean {
  const list = (process.env.ADMIN_USERNAMES || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(username.toLowerCase());
}

function genToken(): string {
  // url-safe random token, 32 bytes
  return "rzbt_" + crypto.randomBytes(32).toString("base64url");
}

function genBotPhone(): string {
  return "bot:" + crypto.randomBytes(6).toString("hex");
}

// GET /api/bots — list all bots in the system (for the bot book)
export async function GET() {
  const bots = await prisma.user.findMany({
    where: { isBot: true },
    select: {
      id: true, name: true, username: true, phone: true, timezone: true, line: true,
      bio: true, isBot: true, botOwnerId: true,
      botOwner: { select: { id: true, name: true, username: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(bots);
}

// POST /api/bots — create a new bot owned by the current user
// Body: { username, name, bio? }
// Returns: bot details + one-time token (NOT shown again on subsequent reads)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { username, name, bio } = body || {};

  if (typeof username !== "string" || !USERNAME_RE.test(username)) {
    return NextResponse.json({ error: "Юзернейм бота: 3–30 символов, латиница/цифры/_" }, { status: 400 });
  }
  if (typeof name !== "string" || !name.trim() || name.length > NAME_MAX) {
    return NextResponse.json({ error: "Имя бота обязательно (до 100 символов)" }, { status: 400 });
  }
  if (bio != null && (typeof bio !== "string" || bio.length > BIO_MAX)) {
    return NextResponse.json({ error: `Описание до ${BIO_MAX} символов` }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return NextResponse.json({ error: "Юзернейм занят" }, { status: 409 });

  // Resolve creator's username so we can decide line assignment.
  const creator = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });
  if (!creator) return NextResponse.json({ error: "owner not found" }, { status: 401 });

  // Line 0 = service, only for admin creators. Everyone else: random 1..6.
  const line = isAdminUsername(creator.username) ? 0 : Math.floor(Math.random() * 6) + 1;

  const token = genToken();
  const bot = await prisma.user.create({
    data: {
      username,
      name: name.trim(),
      phone: genBotPhone(),
      timezone: "UTC+0",
      line,
      bio: bio?.trim() || null,
      passwordHash: null,
      isBot: true,
      botOwnerId: session.user.id,
      botToken: { create: { token } },
    },
    select: {
      id: true, name: true, username: true, phone: true, timezone: true, line: true, bio: true, isBot: true,
    },
  });

  return NextResponse.json({ ...bot, token }, { status: 201 });
}
