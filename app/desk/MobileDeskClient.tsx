"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { getSocket } from "@/lib/socket";
import { useWebRTC } from "@/lib/useWebRTC";
import { decryptMessage, loadPrivateKey, clearPrivateKey } from "@/lib/crypto";

import { MobileTopBar } from "@/components/mobile/MobileTopBar";
import { MobileBottomNav, type MobileTab } from "@/components/mobile/MobileBottomNav";
import { ChatsTab } from "@/components/mobile/ChatsTab";
import { ContactsTab } from "@/components/mobile/ContactsTab";
import { PhoneTab } from "@/components/mobile/PhoneTab";
import { MoreTab } from "@/components/mobile/MoreTab";
import { ComposeScreen } from "@/components/mobile/ComposeScreen";
import { ReadMessageScreen } from "@/components/mobile/ReadMessageScreen";
import { CallScreen } from "@/components/mobile/CallScreen";
import { MobileToast } from "@/components/mobile/MobileToast";

export interface MobileUser {
  id: string;
  name: string;
  phone: string;
  timezone: string;
}

export interface MobileMessage {
  id: string;
  content: string;
  senderName: string;
  senderPhone: string;
  senderTimezone?: string;
  createdAt: string;
  folderId?: string | null;
}

export interface MobileFolder {
  id: string;
  label: string;
  messages: MobileMessage[];
}

type Overlay =
  | { kind: "compose"; prefilledPhone?: string }
  | { kind: "read"; message: MobileMessage; fromFolderId?: string | null }
  | null;

function playIncomingChime() {
  try {
    const ctx = new AudioContext();
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(600 + Math.random() * 300, ctx.currentTime + i * 0.08);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + i * 0.08 + 0.06);
      gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.06);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.06);
    }
  } catch { /* audio not available */ }
}

function tryDecrypt(
  ciphertext: string,
  nonce: string | null | undefined,
  peerPublicKey: string | null | undefined,
): string {
  const privKey = loadPrivateKey();
  if (!privKey || !nonce || !peerPublicKey) return "[недоступно для чтения]";
  const plain = decryptMessage(ciphertext, nonce, peerPublicKey, privKey);
  return plain ?? "[ошибка расшифровки]";
}

export function MobileDeskClient({ user }: { user: MobileUser }) {
  const socket = getSocket();
  const [socketReady, setSocketReady] = useState(false);

  // Active tab
  const [tab, setTab] = useState<MobileTab>("chats");

  // Overlays (full-screen)
  const [overlay, setOverlay] = useState<Overlay>(null);

  // Messages
  const [loosePapers, setLoosePapers] = useState<MobileMessage[]>([]);
  const [folders, setFolders] = useState<MobileFolder[]>([]);
  const [trashedMessages, setTrashedMessages] = useState<MobileMessage[]>([]);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());

  // Toasts
  const [toast, setToast] = useState<{ text: string; kind: "info" | "ok" | "err" } | null>(null);
  function flashToast(text: string, kind: "info" | "ok" | "err" = "info") {
    setToast({ text, kind });
    setTimeout(() => setToast(null), 3200);
  }

  // Send status
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "delivered">("idle");
  const deliveredTimerRef = useRef<NodeJS.Timeout | null>(null);

  // WebRTC
  const {
    callState, remoteUser, localStream, remoteStream,
    initiateCall, handleIncomingCall, acceptCall, rejectCall, hangup, cancelCall,
  } = useWebRTC(socket, user.id);
  const wrongLineRef = useRef<string | null>(null);
  const prevCallStateRef = useRef<string>("idle");

  // Pending "wrong line" system message creation when our outgoing call dies
  // because the callee is on a different channel.
  useEffect(() => {
    if (prevCallStateRef.current === "outgoing" && callState === "idle" && wrongLineRef.current) {
      const receiverLine = wrongLineRef.current;
      wrongLineRef.current = null;
      const sysMsg: MobileMessage = {
        id: `sys-${Date.now()}`,
        content: `СОЕДИНЕНИЕ НЕ УСТАНОВЛЕНО\nАбонент находится на канале ${receiverLine}.\nПодключите нужный канал и повторите звонок.`,
        senderName: "СИСТЕМА",
        senderPhone: "",
        senderTimezone: user.timezone,
        createdAt: new Date().toISOString(),
        folderId: null,
      };
      setLoosePapers(p => [sysMsg, ...p]);
      setUnreadIds(s => new Set(s).add(sysMsg.id));
      flashToast("Неверный канал — сообщение сохранено", "err");
    }
    prevCallStateRef.current = callState;
  }, [callState, user.timezone]);

  // Initial data load
  useEffect(() => {
    async function load() {
      try {
        const [msgRes, folderRes] = await Promise.all([
          fetch("/api/messages"),
          fetch("/api/folders"),
        ]);
        if (msgRes.ok) {
          const msgs = await msgRes.json();
          // Messages received while offline → trashed/missed bucket
          setTrashedMessages(msgs.map((m: any) => ({
            id: m.id,
            content: tryDecrypt(m.content, m.nonce, m.sender.publicKey),
            senderName: m.sender.name,
            senderPhone: m.sender.phone,
            senderTimezone: m.sender.timezone || "",
            createdAt: m.createdAt,
            folderId: m.folderId,
          })));
        }
        if (folderRes.ok) {
          const flds = await folderRes.json();
          const seen = new Set<string>();
          setFolders(flds.flatMap((f: any) => {
            if (seen.has(f.id)) return [];
            seen.add(f.id);
            return [{
              id: f.id,
              label: f.label,
              messages: f.messages.map((m: any) => ({
                id: m.id,
                content: tryDecrypt(m.content, m.nonce, m.sender?.publicKey),
                senderName: m.sender.name,
                senderPhone: m.sender.phone,
                senderTimezone: "",
                createdAt: m.createdAt,
                folderId: f.id,
              })),
            }];
          }));
        }
      } catch { /* ignore */ }
    }
    load();
  }, []);

  // Socket setup
  useEffect(() => {
    socket.connect();
    socket.on("connect", () => {
      socket.emit("register", user.id);
      setSocketReady(true);
    });

    socket.on("message:receive", (message: any) => {
      const msg: MobileMessage = {
        id: message.id,
        content: tryDecrypt(message.content, message.nonce, message.sender.publicKey),
        senderName: message.sender.name,
        senderPhone: message.sender.phone,
        senderTimezone: message.sender.timezone || "",
        createdAt: message.createdAt,
        folderId: null,
      };
      playIncomingChime();
      setLoosePapers(p => [msg, ...p]);
      setUnreadIds(s => new Set(s).add(msg.id));
      flashToast(`Новое: ${msg.senderName}`, "info");
    });

    socket.on("message:delivered", () => {
      setSendStatus("delivered");
      if (deliveredTimerRef.current) clearTimeout(deliveredTimerRef.current);
      deliveredTimerRef.current = setTimeout(() => setSendStatus("idle"), 2500);
    });

    socket.on("message:offline", () => {
      setSendStatus("idle");
      flashToast("Абонент не в сети — сохранено на сервере", "info");
    });

    socket.on("call:incoming", (data: any) => {
      const callerLine = data.callerLine ?? null;
      if (callerLine && callerLine !== user.timezone) {
        socket.emit("call:wrong_line", { callerId: data.callerId, receiverLine: user.timezone });
        return;
      }
      handleIncomingCall(data);
    });
    socket.on("call:ended", hangup);

    socket.on("call:wrong_line", ({ receiverLine }: { receiverLine: string }) => {
      wrongLineRef.current = receiverLine;
    });

    socket.on("call:busy", () => {
      flashToast("📵 Абонент занят", "err");
      cancelCall();
    });

    return () => {
      socket.off("message:receive");
      socket.off("message:delivered");
      socket.off("message:offline");
      socket.off("call:incoming");
      socket.off("call:ended");
      socket.off("call:busy");
      socket.off("call:wrong_line");
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actions
  async function handleCreateFolder(label: string) {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (res.ok) {
      const folder = await res.json();
      setFolders(fs => fs.some(f => f.id === folder.id) ? fs : [...fs, { ...folder, messages: [] }]);
      flashToast("Папка создана", "ok");
    } else {
      flashToast("Не удалось создать папку", "err");
    }
  }

  async function handleFileToFolder(msgId: string, folderId: string) {
    const paper = loosePapers.find(p => p.id === msgId) || trashedMessages.find(m => m.id === msgId);
    if (!paper) return;
    const res = await fetch(`/api/messages/${msgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });
    if (!res.ok) { flashToast("Не удалось переместить", "err"); return; }
    setLoosePapers(p => p.filter(m => m.id !== msgId));
    setTrashedMessages(p => p.filter(m => m.id !== msgId));
    setUnreadIds(s => { const n = new Set(s); n.delete(msgId); return n; });
    setFolders(fs => fs.map(f =>
      f.id === folderId
        ? { ...f, messages: [...f.messages, { ...paper, folderId }].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) }
        : f
    ));
    flashToast("Вложено в папку", "ok");
  }

  async function handlePullFromFolder(msgId: string, folderId: string) {
    const res = await fetch(`/api/messages/${msgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: null }),
    });
    if (!res.ok) { flashToast("Не удалось вытащить", "err"); return; }
    const msg = folders.find(f => f.id === folderId)?.messages.find(m => m.id === msgId);
    if (!msg) return;
    setFolders(fs => fs.map(f => f.id === folderId ? { ...f, messages: f.messages.filter(m => m.id !== msgId) } : f));
    setLoosePapers(p => [{ ...msg, folderId: null }, ...p]);
  }

  async function handleDeleteMessage(msgId: string) {
    const res = await fetch(`/api/messages/${msgId}`, { method: "DELETE" });
    if (!res.ok) { flashToast("Не удалось удалить", "err"); return; }
    setLoosePapers(p => p.filter(m => m.id !== msgId));
    setTrashedMessages(p => p.filter(m => m.id !== msgId));
    setFolders(fs => fs.map(f => ({ ...f, messages: f.messages.filter(m => m.id !== msgId) })));
    setUnreadIds(s => { const n = new Set(s); n.delete(msgId); return n; });
  }

  function handleMessageSent(receiverId: string, message: any) {
    setSendStatus("sending");
    socket.emit("message:send", { receiverId, message });
  }

  const handleDial = useCallback(async (phone: string, line?: string) => {
    const res = await fetch(`/api/users?phone=${encodeURIComponent(phone)}`);
    if (!res.ok) { flashToast("Абонент не найден", "err"); return; }
    const target = await res.json();
    const chosenLine = line ?? localStorage.getItem("rz:phone_line") ?? undefined;
    if (!chosenLine) { flashToast("Сначала выберите канал", "err"); return; }
    await initiateCall(target, chosenLine);
  }, [initiateCall]);

  function handleOpenCompose(prefilledPhone?: string) {
    setOverlay({ kind: "compose", prefilledPhone });
  }

  function handleOpenMessage(message: MobileMessage, fromFolderId?: string | null) {
    setUnreadIds(s => { const n = new Set(s); n.delete(message.id); return n; });
    setOverlay({ kind: "read", message, fromFolderId });
  }

  function handleCallContact(contact: { id: string; name: string; phone: string }) {
    const line = localStorage.getItem("rz:phone_line") ?? undefined;
    if (!line) { flashToast("Сначала подключите канал", "err"); setTab("phone"); return; }
    initiateCall(contact, line);
  }

  function handleLogout() {
    clearPrivateKey();
    signOut({ callbackUrl: "/login" });
  }

  const unreadCount = unreadIds.size;
  const inCall = callState !== "idle";

  return (
    <div
      className="relative"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #14100a 0%, #1a1008 40%, #20160c 100%)",
        color: "#f5e8c8",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "calc(60px + env(safe-area-inset-bottom))",
      }}
    >
      <MobileTopBar
        user={user}
        online={socketReady}
        unreadCount={unreadCount}
        sendStatus={sendStatus}
      />

      <main className="flex-1 relative" style={{ paddingTop: 4 }}>
        {tab === "chats" && (
          <ChatsTab
            timezone={user.timezone}
            folders={folders}
            loosePapers={loosePapers}
            unreadIds={unreadIds}
            sendStatus={sendStatus}
            onOpenMessage={handleOpenMessage}
            onOpenCompose={() => handleOpenCompose()}
            onCreateFolder={handleCreateFolder}
            onPullFromFolder={handlePullFromFolder}
            onDeleteMessage={handleDeleteMessage}
          />
        )}
        {tab === "contacts" && (
          <ContactsTab
            currentUserId={user.id}
            onCall={handleCallContact}
            onMessage={(c) => handleOpenCompose(c.phone)}
          />
        )}
        {tab === "phone" && (
          <PhoneTab
            timezone={user.timezone}
            onDial={handleDial}
            callState={callState}
          />
        )}
        {tab === "more" && (
          <MoreTab
            user={user}
            trashedMessages={trashedMessages}
            folders={folders}
            timezone={user.timezone}
            onOpenMessage={handleOpenMessage}
            onDeleteMessage={handleDeleteMessage}
            onFileToFolder={handleFileToFolder}
            onLogout={handleLogout}
          />
        )}
      </main>

      <MobileBottomNav tab={tab} onChange={setTab} unreadCount={unreadCount} />

      {/* Full-screen overlays */}
      <AnimatePresence>
        {overlay?.kind === "compose" && (
          <ComposeScreen
            key="compose"
            currentUserId={user.id}
            prefilledPhone={overlay.prefilledPhone}
            socket={socket}
            onMessageSent={handleMessageSent}
            onClose={() => setOverlay(null)}
          />
        )}
        {overlay?.kind === "read" && (
          <ReadMessageScreen
            key={`read-${overlay.message.id}`}
            message={overlay.message}
            timezone={user.timezone}
            folders={folders}
            fromFolderId={overlay.fromFolderId ?? null}
            onClose={() => setOverlay(null)}
            onFileToFolder={async (folderId) => {
              await handleFileToFolder(overlay.message.id, folderId);
              setOverlay(null);
            }}
            onPullFromFolder={async () => {
              if (overlay.fromFolderId) {
                await handlePullFromFolder(overlay.message.id, overlay.fromFolderId);
                setOverlay(null);
              }
            }}
            onDelete={async () => {
              await handleDeleteMessage(overlay.message.id);
              setOverlay(null);
            }}
            onReply={() => {
              const phone = overlay.message.senderPhone;
              setOverlay(null);
              if (phone) handleOpenCompose(phone);
            }}
            onCreateFolder={handleCreateFolder}
          />
        )}
      </AnimatePresence>

      {/* Call UI is its own full-screen overlay */}
      <AnimatePresence>
        {inCall && (
          <CallScreen
            key="call"
            state={callState}
            remoteUser={remoteUser || undefined}
            remoteStream={remoteStream}
            onAccept={acceptCall}
            onReject={rejectCall}
            onHangup={hangup}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && <MobileToast text={toast.text} kind={toast.kind} />}
      </AnimatePresence>
    </div>
  );
}
