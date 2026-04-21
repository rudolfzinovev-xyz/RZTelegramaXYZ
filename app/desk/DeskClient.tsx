"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { getSocket } from "@/lib/socket";
import { useWebRTC } from "@/lib/useWebRTC";

import { Teletype } from "@/components/teletype/Teletype";
import { TeletypeModal } from "@/components/teletype/TeletypeModal";
import { PaperStrip } from "@/components/teletype/PaperStrip";
import { RotaryPhone } from "@/components/phone/RotaryPhone";
import { PhoneModal } from "@/components/phone/PhoneModal";
import { CallModal } from "@/components/phone/CallModal";
import { PhoneBook } from "@/components/phonebook/PhoneBook";
import { DeskClock } from "@/components/desk/DeskClock";
import { MusicPlayer } from "@/components/desk/MusicPlayer";
import { FolderStack } from "@/components/folder/FolderStack";
import { MessageSlip } from "@/components/folder/MessageSlip";
import { MissedInbox } from "@/components/desk/MissedInbox";
import { TrashBin } from "@/components/desk/TrashBin";
import { decryptMessage, loadPrivateKey, clearPrivateKey } from "@/lib/crypto";
import { ensureNotificationPermission, notify } from "@/lib/notifications";

interface User {
  id: string;
  name: string;
  phone: string;
  timezone: string;
}

interface MessageData {
  id: string;
  content: string;
  senderName: string;
  senderPhone: string;
  senderTimezone?: string;
  createdAt: string;
  folderId?: string | null;
}

interface FolderData {
  id: string;
  label: string;
  messages: MessageData[];
}

function playIncomingSound() {
  try {
    const ctx = new AudioContext();
    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(600 + Math.random() * 300, ctx.currentTime + i * 0.07);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + i * 0.07 + 0.06);
      gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.06);
      osc.start(ctx.currentTime + i * 0.07);
      osc.stop(ctx.currentTime + i * 0.07 + 0.06);
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

function msgJitter(id: string) {
  const seed = parseInt(id.replace(/[^0-9a-f]/gi, "").slice(-8) || "ff", 16);
  return {
    jx: (seed % 40) - 20,
    jy: ((seed >> 8) % 30) - 15,
    rot: ((seed >> 16) % 12) - 6,
  };
}

export function DeskClient({ user }: { user: User }) {
  const socket = getSocket();
  const [socketReady, setSocketReady] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);

  // Messages state
  const [incomingQueue, setIncomingQueue] = useState<MessageData[]>([]);
  const [currentStrip, setCurrentStrip] = useState<MessageData | null>(null);
  const [loosePapers, setLoosePapers] = useState<MessageData[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);

  // UI state
  const [teletypeOpen, setTeletypeOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [prefilledPhone, setPrefilledPhone] = useState<string | undefined>();

  // Busy notification
  const [busyToast, setBusyToast] = useState(false);

  // Send status for teletype lamp
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "delivered">("idle");
  const deliveredTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Wastebasket
  const [trashedMessages, setTrashedMessages] = useState<MessageData[]>([]);
  const [offlineToast, setOfflineToast] = useState(false);

  // Title blink ref
  const titleBlinkRef = useRef<NodeJS.Timeout | null>(null);

  // WebRTC
  const { callState, remoteUser, localStream, remoteStream, initiateCall, handleIncomingCall, acceptCall, rejectCall, hangup, cancelCall } = useWebRTC(socket, user.id);
  const wrongLineRef = useRef<string | null>(null);
  const prevCallStateRef = useRef<string>("idle");


  useEffect(() => {
    if (prevCallStateRef.current === "outgoing" && callState === "idle" && wrongLineRef.current) {
      const receiverLine = wrongLineRef.current;
      wrongLineRef.current = null;
      const sysMsg: MessageData = {
        id: `sys-${Date.now()}`,
        content: `СОЕДИНЕНИЕ НЕ УСТАНОВЛЕНО\nАбонент находится на канале ${receiverLine}.\nПодключите нужный канал и повторите звонок.`,
        senderName: "СИСТЕМА",
        senderPhone: "",
        senderTimezone: user.timezone,
        createdAt: new Date().toISOString(),
        folderId: null,
      };
      playIncomingSound();
      setIncomingQueue((q) => [...q, sysMsg]);
    }
    prevCallStateRef.current = callState;
  }, [callState]);

  function startTitleBlink() {
    if (titleBlinkRef.current) return;
    let toggle = false;
    titleBlinkRef.current = setInterval(() => {
      document.title = toggle ? "RZTelegramaXYZ" : "📩 НОВОЕ СООБЩЕНИЕ";
      toggle = !toggle;
    }, 800);
  }

  function stopTitleBlink() {
    if (titleBlinkRef.current) {
      clearInterval(titleBlinkRef.current);
      titleBlinkRef.current = null;
      document.title = "RZTelegramaXYZ";
    }
  }

  // Stop title blink when user focuses the window
  useEffect(() => {
    const onFocus = () => stopTitleBlink();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Ask for notification permission once after mount.
  useEffect(() => {
    ensureNotificationPermission();
  }, []);

  // Track all known message IDs across buckets for re-sync dedup.
  const knownMsgIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const ids = new Set<string>();
    loosePapers.forEach(m => ids.add(m.id));
    trashedMessages.forEach(m => ids.add(m.id));
    folders.forEach(f => f.messages.forEach(m => ids.add(m.id)));
    knownMsgIdsRef.current = ids;
  }, [loosePapers, trashedMessages, folders]);

  // Fetch undelivered server-side messages and merge any unseen ones into
  // the wastebasket bucket. Called on mount, socket reconnect, and on
  // visibility change — so offline messages show up without a manual reload.
  const syncOfflineMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) return;
      const msgs = await res.json();
      const fresh = msgs
        .filter((m: any) => !knownMsgIdsRef.current.has(m.id))
        .map((m: any) => ({
          id: m.id,
          content: tryDecrypt(m.content, m.nonce, m.sender.publicKey),
          senderName: m.sender.name,
          senderPhone: m.sender.phone,
          senderTimezone: m.sender.timezone || "",
          createdAt: m.createdAt,
          folderId: m.folderId,
        }));
      if (!fresh.length) return;
      setTrashedMessages(prev => [...fresh, ...prev]);
    } catch { /* ignore */ }
  }, []);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      const folderRes = await fetch("/api/folders");
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
      await syncOfflineMessages();
    }
    loadData();
  }, [syncOfflineMessages]);

  // Re-sync offline messages whenever the tab becomes visible again.
  useEffect(() => {
    function onVisible() {
      if (!document.hidden) syncOfflineMessages();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [syncOfflineMessages]);

  // Socket setup
  useEffect(() => {
    socket.connect();
    socket.on("connect", () => {
      socket.emit("register", user.id);
      setSocketReady(true);
      // Re-sync on every connect — picks up messages received while offline.
      syncOfflineMessages();
    });

    socket.on("message:receive", (message: any) => {
      const msg: MessageData = {
        id: message.id,
        content: tryDecrypt(message.content, message.nonce, message.sender.publicKey),
        senderName: message.sender.name,
        senderPhone: message.sender.phone,
        senderTimezone: message.sender.timezone || "",
        createdAt: message.createdAt,
        folderId: null,
      };
      playIncomingSound();
      startTitleBlink();
      setIncomingQueue((q) => [...q, msg]);
      notify("Новое сообщение", `От: ${msg.senderName}`, { tag: `msg-${msg.id}` });
    });

    socket.on("message:delivered", () => {
      setSendStatus("delivered");
      if (deliveredTimerRef.current) clearTimeout(deliveredTimerRef.current);
      deliveredTimerRef.current = setTimeout(() => setSendStatus("idle"), 3000);
    });

    socket.on("message:offline", () => {
      setSendStatus("idle");
      setOfflineToast(true);
      setTimeout(() => setOfflineToast(false), 4000);
    });

    socket.on("call:incoming", (data: any) => {
      const callerLine = data.callerLine ?? null;
      // Call reaches me only if caller plugged into MY timezone channel
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

    // Busy signal: receiver is in a call
    socket.on("call:busy", () => {
      setBusyToast(true);
      setTimeout(() => setBusyToast(false), 3000);
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
  }, []);

  // Show paper strip from queue
  useEffect(() => {
    if (!currentStrip && incomingQueue.length > 0) {
      setCurrentStrip(incomingQueue[0]);
      setIncomingQueue((q) => q.slice(1));
    }
  }, [incomingQueue, currentStrip]);

  // Dismiss strip without tearing → goes to missed inbox
  function handleDismissPaper(msg: MessageData) {
    setCurrentStrip(null);
    setTrashedMessages(prev => [msg, ...prev]);
    stopTitleBlink();
  }

  // Rescue from missed inbox → goes to desk
  function handleRescueFromInbox(msg: MessageData) {
    setTrashedMessages(prev => prev.filter(m => m.id !== msg.id));
    setLoosePapers(prev => [...prev, msg]);
  }

  // Stop title blink when strip is torn (user noticed)
  function handleTearPaper(msg: MessageData) {
    setCurrentStrip(null);
    setLoosePapers((p) => [...p, msg]);
    stopTitleBlink();
  }

  async function handleDropToFolder(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || !active) return;
    const messageId = active.id as string;
    const targetId = over.id as string;

    // Drop to trash bin — permanently delete
    if (targetId === "trashbin") {
      setLoosePapers(p => p.filter(m => m.id !== messageId));
      setTrashedMessages(p => p.filter(m => m.id !== messageId));
      await fetch(`/api/messages/${messageId}`, { method: "DELETE" });
      return;
    }

    // Drop to missed inbox — move from loose to missed
    if (targetId === "missed-inbox") {
      const paper = loosePapers.find(p => p.id === messageId);
      if (paper) {
        setLoosePapers(p => p.filter(m => m.id !== messageId));
        setTrashedMessages(prev => [paper, ...prev]);
      }
      return;
    }

    const folderId = targetId;
    if (!folders.find((f) => f.id === folderId)) return;

    await fetch(`/api/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });

    const paper = loosePapers.find((p) => p.id === messageId);
    if (!paper) return;
    setLoosePapers((p) => p.filter((m) => m.id !== messageId));
    setFolders((fs) =>
      fs.map((f) =>
        f.id === folderId
          ? { ...f, messages: [...f.messages, { ...paper, folderId }].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) }
          : f
      )
    );
  }

  async function handleCreateFolder(label: string) {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (res.ok) {
      const folder = await res.json();
      setFolders((fs) => fs.some(f => f.id === folder.id) ? fs : [...fs, { ...folder, messages: [] }]);
    }
  }

  async function handlePullFromFolder(msgId: string, folderId: string) {
    await fetch(`/api/messages/${msgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: null }),
    });
    const msg = folders.find(f => f.id === folderId)?.messages.find(m => m.id === msgId);
    if (!msg) return;
    setFolders(fs => fs.map(f => f.id === folderId ? { ...f, messages: f.messages.filter(m => m.id !== msgId) } : f));
    setLoosePapers(p => [...p, { ...msg, folderId: null }]);
  }

  async function handleDeleteFromFolder(msgId: string, folderId: string) {
    await fetch(`/api/messages/${msgId}`, { method: "DELETE" });
    setFolders(fs => fs.map(f => f.id === folderId ? { ...f, messages: f.messages.filter(m => m.id !== msgId) } : f));
  }

  async function handleDial(phone: string) {
    const res = await fetch(`/api/users?phone=${encodeURIComponent(phone)}`);
    if (!res.ok) return;
    const target = await res.json();
    const line = localStorage.getItem("rz:phone_line") ?? undefined;
    await initiateCall(target, line);
  }

  function handleCallContact(contact: { id: string; name: string; phone: string }) {
    const line = localStorage.getItem("rz:phone_line") ?? undefined;
    initiateCall(contact, line);
  }

  function handleMessageContact(contact: { id: string; name: string; phone: string }) {
    setPrefilledPhone(contact.phone);
    setTeletypeOpen(true);
  }

  function handleMessageSent(receiverId: string, message: any) {
    setSendStatus("sending");
    socket.emit("message:send", { receiverId, message });
  }

  const hasIncoming = incomingQueue.length > 0 || currentStrip !== null;
  const isPrinting = currentStrip !== null;

  return (
    <DndContext onDragEnd={handleDropToFolder}>
      <div className="desk-surface w-screen h-screen overflow-hidden relative">
        {/* User info bar */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-2 z-10"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", borderBottom: "1px solid rgba(218,165,32,0.2)" }}
        >
          <div className="font-typewriter text-xs tracking-widest uppercase" style={{ color: "#DAA520" }}>
            RZTelegramaXYZ
          </div>
          <div className="flex items-center gap-4">
            <span className="font-courier text-xs" style={{ color: "#9a8870" }}>
              {user.name} · {user.phone} · {user.timezone}
            </span>
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: socketReady ? "#228B22" : "#CC2200", boxShadow: socketReady ? "0 0 4px #228B22" : "none" }}
            />
            <button
              onClick={() => { clearPrivateKey(); signOut({ callbackUrl: "/login" }); }}
              className="font-typewriter text-xs tracking-wider uppercase px-2 py-1"
              style={{ color: "#8a6a4a", border: "1px solid #3a2a18", borderRadius: "3px", background: "transparent", cursor: "pointer" }}
            >
              Выйти
            </button>
          </div>
        </div>

        {/* Main desk layout */}
        <div className="absolute inset-0 pt-10 flex items-center justify-center">
          <div className="relative" style={{ width: 900, height: 580 }}>

            {/* Teletype — left */}
            <div className="absolute" style={{ left: 40, top: 80 }}>
              <Teletype hasIncoming={hasIncoming} onOpen={() => setTeletypeOpen(true)} slotRef={slotRef} isPrinting={isPrinting} sendStatus={sendStatus} />
              {currentStrip && (
                <PaperStrip
                  message={currentStrip}
                  onTear={handleTearPaper}
                  onDismiss={() => currentStrip && handleDismissPaper(currentStrip)}
                  slotTop={(slotRef.current?.offsetTop ?? 52) + (slotRef.current?.offsetHeight ?? 80)}
                  slotLeft={(slotRef.current?.offsetLeft ?? 40)}
                  timezone={user.timezone}
                />
              )}
            </div>

            {/* Phone — center-left */}
            <div className="absolute" style={{ left: 360, top: 100 }}>
              <RotaryPhone
                callState={callState}
                remoteUser={remoteUser || undefined}
                timezone={user.timezone}
                onPickUp={() => {
                  if (callState === "incoming") acceptCall();
                  else if (callState === "connected" || callState === "outgoing") hangup();
                }}
                onOpen={() => setPhoneOpen(true)}
              />
            </div>

            {/* Phone book — right */}
            <div className="absolute" style={{ right: 80, top: 80 }}>
              <PhoneBook
                currentUserId={user.id}
                onCallContact={handleCallContact}
                onMessageContact={handleMessageContact}
              />
            </div>

            {/* Desk clock — bottom right corner */}
            <div className="absolute" style={{ right: 0, bottom: 20 }}>
              <DeskClock timezone={user.timezone} />
            </div>

            {/* Gramophone — next to clock */}
            <div className="absolute" style={{ right: 90, bottom: 0, zIndex: 20 }}>
              <MusicPlayer />
            </div>

            {/* Folders area — bottom, starts right of baskets */}
            <div className="absolute" style={{ bottom: 20, left: 255, right: 120 }}>
              <FolderStack
                folders={folders}
                timezone={user.timezone}
                onCreateFolder={handleCreateFolder}
                onPullFromFolder={handlePullFromFolder}
                onDeleteFromFolder={handleDeleteFromFolder}
              />
            </div>

            {/* Trash bin — bottom left corner */}
            <div className="absolute" style={{ left: 10, bottom: 10, zIndex: 5 }}>
              <TrashBin count={0} />
            </div>

            {/* Missed inbox — right of trash bin */}
            <div className="absolute" style={{ left: 130, bottom: 10, zIndex: 5 }}>
              <MissedInbox
                messages={trashedMessages}
                onRescue={handleRescueFromInbox}
                timezone={user.timezone}
              />
            </div>

            {/* Loose papers on desk */}
            {loosePapers.map((paper, i) => {
              const { jx, jy } = msgJitter(paper.id);
              return (
                <div
                  key={paper.id}
                  className="absolute"
                  style={{
                    left: 200 + (i % 4) * 165 + jx,
                    top: 340 + Math.floor(i / 4) * 115 + jy,
                    zIndex: i + 1,
                  }}
                >
                  <MessageSlip
                    id={paper.id}
                    content={paper.content}
                    senderName={paper.senderName}
                    senderPhone={paper.senderPhone}
                    createdAt={paper.createdAt}
                    timezone={user.timezone}
                  />
                </div>
              );
            })}

          </div>
        </div>

        {/* Teletype send modal */}
        <TeletypeModal
          open={teletypeOpen}
          onClose={() => { setTeletypeOpen(false); setPrefilledPhone(undefined); }}
          currentUserId={user.id}
          onMessageSent={handleMessageSent}
          prefilledPhone={prefilledPhone}
          socket={socket}
        />

        {/* Phone dial modal */}
        <PhoneModal
          open={phoneOpen}
          onClose={() => setPhoneOpen(false)}
          onDial={handleDial}
          timezone={user.timezone}
        />

        {/* Call UI */}
        <CallModal
          state={callState}
          remoteUser={remoteUser || undefined}
          onHangup={hangup}
          localStream={localStream}
          remoteStream={remoteStream}
        />

        {/* Busy signal toast */}
        <AnimatePresence>
          {busyToast && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 font-typewriter text-sm tracking-widest uppercase"
              style={{
                background: "linear-gradient(135deg, #1a0a0a, #2a1010)",
                border: "2px solid #CC2200",
                borderRadius: "6px",
                color: "#FF6644",
                boxShadow: "0 4px 20px rgba(200,0,0,0.4)",
              }}
            >
              📵 Абонент занят
            </motion.div>
          )}
        </AnimatePresence>

        {/* Offline toast */}
        <AnimatePresence>
          {offlineToast && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 font-typewriter text-sm tracking-widest uppercase"
              style={{
                background: "linear-gradient(135deg, #0a0a1a, #10101a)",
                border: "2px solid #4a4a8a",
                borderRadius: "6px",
                color: "#8888cc",
                boxShadow: "0 4px 20px rgba(60,60,150,0.3)",
              }}
            >
              📭 Абонент не в сети — сообщение сохранено
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DndContext>
  );
}
