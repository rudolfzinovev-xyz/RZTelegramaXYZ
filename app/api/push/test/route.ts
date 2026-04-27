import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@rztelegrama.xyz";
const pushEnabled = Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
if (pushEnabled) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

// POST /api/push/test — sends a test push to all of the current user's subscriptions
// and returns a per-endpoint diagnostic so the client can see what's happening.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!pushEnabled) {
    return NextResponse.json({ ok: false, reason: "VAPID keys not configured on server" }, { status: 200 });
  }

  const subs = await prisma.pushSubscription.findMany({ where: { userId: session.user.id } });
  if (!subs.length) {
    return NextResponse.json({ ok: false, reason: "No subscriptions stored for this user. Tap 'Включить уведомления' first.", count: 0 });
  }

  const payload = JSON.stringify({
    title: "Тест push",
    body: "Это тестовое уведомление от сервера",
    tag: "test-push",
    url: "/desk",
  });

  const results = await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 60 },
      );
      return { endpoint: s.endpoint.slice(0, 60) + "...", ok: true };
    } catch (err: any) {
      // Drop dead subs while we're here
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { endpoint: s.endpoint } }).catch(() => {});
      }
      return {
        endpoint: s.endpoint.slice(0, 60) + "...",
        ok: false,
        statusCode: err?.statusCode,
        body: err?.body || err?.message,
      };
    }
  }));

  return NextResponse.json({ ok: true, count: subs.length, results });
}
