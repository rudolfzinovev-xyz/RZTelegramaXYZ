import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createHmac } from "crypto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const secret = process.env.TURN_SECRET;
  if (!secret) return NextResponse.json({ iceServers: [] });

  // Credentials valid for 1 hour
  const ttl = 3600;
  const timestamp = Math.floor(Date.now() / 1000) + ttl;
  const username = `${timestamp}:${session.user.id}`;
  const credential = createHmac("sha1", secret).update(username).digest("base64");

  const host = "178.215.238.31";
  const tlsHost = "telegrama.rudolfzinovev.xyz";

  return NextResponse.json({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: [
          `turn:${host}:3478?transport=udp`,
          `turn:${host}:3478?transport=tcp`,
          `turns:${tlsHost}:5349?transport=tcp`,
        ],
        username,
        credential,
      },
    ],
  });
}
