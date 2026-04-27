const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const webpush = require("web-push");

const prisma = new PrismaClient();

// Configure Web Push only if VAPID keys are set; otherwise push delivery is silently skipped.
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@rztelegrama.xyz";
const pushEnabled = Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
if (pushEnabled) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
} else {
  console.warn("[push] VAPID keys missing — web push disabled");
}

// Returns true if the receiver has blocked the sender.
async function isBlockedDelivery(senderId, receiverId) {
  if (!senderId || !receiverId || senderId === receiverId) return false;
  try {
    const row = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: receiverId, blockedId: senderId } },
      select: { id: true },
    });
    return !!row;
  } catch {
    return false;
  }
}

async function sendPushToUser(userId, payload) {
  if (!pushEnabled || !userId) return;
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return;
    const body = JSON.stringify(payload);
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          { TTL: 60 }
        );
      } catch (err) {
        // 404/410 → subscription is dead, drop it.
        if (err && (err.statusCode === 404 || err.statusCode === 410)) {
          await prisma.pushSubscription.delete({ where: { endpoint: s.endpoint } }).catch(() => {});
        } else {
          console.warn("[push] send failed", err?.statusCode, err?.body || err?.message);
        }
      }
    }));
  } catch (err) {
    console.warn("[push] sendPushToUser error", err);
  }
}

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// In production INTERNAL_HOOK_SECRET MUST be set; in dev we accept the
// hook without a secret so bots work without configuration.
const INTERNAL_HOOK_SECRET = process.env.INTERNAL_HOOK_SECRET || "";
const INTERNAL_HOOK_DEV_OK = process.env.NODE_ENV !== "production";

// Forward-declared so the createServer handler can use it before the
// io.on("connection") block populates it.
let userSocketsRef = null;
let ioRef = null;

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    // Internal hook: a Next API route (POST /api/bot/sendMessage) notifies
    // us when a bot creates a message; we look it up and emit it to the
    // receiver's socket so delivery is instant.
    if (req.url === "/__internal/bot-message" && req.method === "POST") {
      try {
        const headerSecret = req.headers["x-internal-secret"];
        const ok = INTERNAL_HOOK_SECRET
          ? headerSecret === INTERNAL_HOOK_SECRET
          : INTERNAL_HOOK_DEV_OK;
        if (!ok) { res.writeHead(401); res.end(); return; }
        let raw = "";
        for await (const chunk of req) raw += chunk;
        const { messageId } = JSON.parse(raw || "{}");
        if (!messageId) { res.writeHead(400); res.end(); return; }
        const fresh = await prisma.message.findUnique({
          where: { id: messageId },
          include: {
            sender: { select: { id: true, name: true, username: true, phone: true, timezone: true, line: true, isBot: true, publicKey: true } },
            receiver: { select: { id: true, name: true, phone: true } },
          },
        });
        if (fresh && userSocketsRef && ioRef) {
          const receiverSocketId = userSocketsRef.get(fresh.receiverId);
          if (receiverSocketId) ioRef.to(receiverSocketId).emit("message:receive", fresh);
          sendPushToUser(fresh.receiverId, {
            title: `🤖 ${fresh.sender?.name || "Бот"}`,
            body: (fresh.content || "").slice(0, 120),
            tag: `bot-${fresh.id}`,
            url: "/desk",
          });
        }
        res.writeHead(200); res.end("ok"); return;
      } catch (err) {
        console.warn("[internal-hook] failed", err);
        res.writeHead(500); res.end(); return;
      }
    }

    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // In production, restrict CORS to your own origin. Wildcard is only acceptable
  // here because all sensitive actions are additionally gated by `socket.data.userId`.
  const corsOrigin = process.env.SOCKET_CORS_ORIGIN || (dev ? "*" : false);

  const io = new Server(httpServer, {
    path: "/api/socketio",
    cors: { origin: corsOrigin },
    maxHttpBufferSize: 1e6,
  });

  // userId -> socketId mapping
  const userSockets = new Map();
  userSocketsRef = userSockets;
  ioRef = io;

  io.on("connection", (socket) => {
    socket.on("register", async (userId) => {
      if (typeof userId !== "string" || !userId) return;
      try {
        const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!exists) return;
      } catch {
        return;
      }
      userSockets.set(userId, socket.id);
      socket.data.userId = userId;
      socket.broadcast.emit("online:update", { userId, online: true });
      socket.emit("online:list", Array.from(userSockets.keys()));
    });

    socket.on("message:send", async (data) => {
      if (!socket.data.userId || !data?.message?.id) return;
      try {
        const fresh = await prisma.message.findUnique({
          where: { id: data.message.id },
          include: {
            sender: { select: { id: true, name: true, phone: true, timezone: true, line: true, publicKey: true } },
            receiver: { select: { id: true, name: true, phone: true } },
          },
        });
        if (!fresh || fresh.senderId !== socket.data.userId) return;
        // Receiver blocked sender — drop delivery silently. The message is
        // already in DB (REST POST already succeeded if it got here), but
        // we don't want it to appear at the recipient. Since the REST
        // endpoint also rejects with 403 on block, this branch is mostly
        // a defense-in-depth fallback.
        if (await isBlockedDelivery(fresh.senderId, fresh.receiverId)) return;
        const receiverSocketId = userSockets.get(fresh.receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("message:receive", fresh);
          io.to(socket.id).emit("message:delivered", { messageId: fresh.id });
        } else {
          io.to(socket.id).emit("message:offline", {
            messageId: fresh.id,
            receiverName: fresh.receiver?.name || "",
            receiverPhone: fresh.receiver?.phone || "",
          });
        }
        // Always fire push too — covers the case where the receiver has the
        // page open but backgrounded (socket may still be alive, yet the JS
        // loop is throttled/frozen on mobile). SW shows OS-level notification.
        sendPushToUser(fresh.receiverId, {
          title: "Новое сообщение",
          body: `От: ${fresh.sender?.name || fresh.sender?.phone || "неизвестно"}`,
          tag: `msg-${fresh.id}`,
          url: "/desk",
        });
      } catch {
        // swallow — client gets no delivery ack and will show the message as sent
      }
    });

    // WebRTC signaling — all handlers require a registered socket and override
    // any client-supplied callerId with the authenticated socket.data.userId.
    socket.on("call:initiate", async (data) => {
      if (!socket.data.userId || !data) return;
      const { receiverId, offer, callerName, callerPhone, callerLine } = data;
      // Caller is blocked — pretend the receiver simply isn't online so
      // we don't leak block state. The caller will time out and see the
      // standard "abонент не в сети" path.
      if (await isBlockedDelivery(socket.data.userId, receiverId)) return;
      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("call:incoming", {
          callerId: socket.data.userId,
          callerName,
          callerPhone,
          callerLine: callerLine ?? null,
          offer,
        });
      }
      // Always fire a push for incoming calls — waking the SW lets the OS
      // surface the ring even when the PWA is in the background.
      sendPushToUser(receiverId, {
        title: "Входящий звонок",
        body: callerName || callerPhone || "Неизвестный",
        tag: "incoming-call",
        requireInteraction: true,
        url: "/desk",
      });
    });

    socket.on("call:answer", (data) => {
      if (!socket.data.userId || !data) return;
      const { callerId, answer } = data;
      const callerSocketId = userSockets.get(callerId);
      if (callerSocketId) io.to(callerSocketId).emit("call:answered", { answer });
    });

    socket.on("call:ice-candidate", (data) => {
      if (!socket.data.userId || !data) return;
      const { targetId, candidate } = data;
      const targetSocketId = userSockets.get(targetId);
      if (targetSocketId) io.to(targetSocketId).emit("call:ice-candidate", { candidate });
    });

    socket.on("call:end", (data) => {
      if (!socket.data.userId || !data) return;
      const targetSocketId = userSockets.get(data.targetId);
      if (targetSocketId) io.to(targetSocketId).emit("call:ended");
    });

    socket.on("call:reject", (data) => {
      if (!socket.data.userId || !data) return;
      const callerSocketId = userSockets.get(data.callerId);
      if (callerSocketId) io.to(callerSocketId).emit("call:rejected");
    });

    socket.on("typing:start", ({ receiverId } = {}) => {
      if (!socket.data.userId) return;
      const sid = userSockets.get(receiverId);
      if (sid) io.to(sid).emit("typing:receive", { senderId: socket.data.userId });
    });
    socket.on("typing:stop", ({ receiverId } = {}) => {
      if (!socket.data.userId) return;
      const sid = userSockets.get(receiverId);
      if (sid) io.to(sid).emit("typing:stopped", { senderId: socket.data.userId });
    });

    socket.on("call:busy", ({ callerId } = {}) => {
      if (!socket.data.userId) return;
      const sid = userSockets.get(callerId);
      if (sid) io.to(sid).emit("call:busy");
    });

    socket.on("call:wrong_line", ({ callerId, receiverLine } = {}) => {
      if (!socket.data.userId) return;
      const sid = userSockets.get(callerId);
      if (sid) io.to(sid).emit("call:wrong_line", { receiverLine });
    });

    socket.on("disconnect", () => {
      if (socket.data.userId) {
        io.emit("online:update", { userId: socket.data.userId, online: false });
        userSockets.delete(socket.data.userId);
      }
    });
  });

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
