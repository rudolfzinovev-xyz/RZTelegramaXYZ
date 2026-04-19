const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
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
            sender: { select: { id: true, name: true, phone: true, timezone: true, publicKey: true } },
          },
        });
        if (!fresh || fresh.senderId !== socket.data.userId) return;
        const receiverSocketId = userSockets.get(fresh.receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("message:receive", fresh);
          io.to(socket.id).emit("message:delivered", { messageId: fresh.id });
        } else {
          io.to(socket.id).emit("message:offline", { messageId: fresh.id });
        }
      } catch {
        // swallow — client gets no delivery ack and will show the message as sent
      }
    });

    // WebRTC signaling — all handlers require a registered socket and override
    // any client-supplied callerId with the authenticated socket.data.userId.
    socket.on("call:initiate", (data) => {
      if (!socket.data.userId || !data) return;
      const { receiverId, offer, callerName, callerPhone, callerLine } = data;
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
