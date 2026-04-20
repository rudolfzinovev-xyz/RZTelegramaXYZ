"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Socket } from "socket.io-client";
import { encryptMessage, loadPrivateKey } from "@/lib/crypto";

interface Props {
  currentUserId: string;
  prefilledPhone?: string;
  socket?: Socket;
  onMessageSent: (receiverId: string, message: any) => void;
  onClose: () => void;
}

type Step = "recipient" | "compose";

interface Recipient {
  id: string;
  name: string;
  phone: string;
  publicKey?: string | null;
}

export function ComposeScreen({
  currentUserId, prefilledPhone, socket, onMessageSent, onClose,
}: Props) {
  const [step, setStep] = useState<Step>("recipient");
  const [phone, setPhone] = useState(prefilledPhone || "");
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const typingStopRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket || !recipient) return;
    const onTyping = ({ senderId }: { senderId: string }) => {
      if (senderId === recipient.id) setPeerTyping(true);
    };
    const onTypingStopped = ({ senderId }: { senderId: string }) => {
      if (senderId === recipient.id) setPeerTyping(false);
    };
    socket.on("typing:receive", onTyping);
    socket.on("typing:stopped", onTypingStopped);
    return () => {
      socket.off("typing:receive", onTyping);
      socket.off("typing:stopped", onTypingStopped);
    };
  }, [socket, recipient?.id]);

  async function handleLookup() {
    if (!phone.trim()) return;
    setError("");
    setLookupBusy(true);
    try {
      const res = await fetch(`/api/users?phone=${encodeURIComponent(phone.trim())}`);
      if (!res.ok) { setError("Абонент не найден"); setLookupBusy(false); return; }
      const user = await res.json();
      if (user.id === currentUserId) {
        setError("Нельзя писать самому себе");
        setLookupBusy(false);
        return;
      }
      setRecipient(user);
      setStep("compose");
    } catch {
      setError("Ошибка соединения");
    }
    setLookupBusy(false);
  }

  function handleTextChange(v: string) {
    setText(v);
    if (socket && recipient) {
      socket.emit("typing:start", { receiverId: recipient.id });
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      typingStopRef.current = setTimeout(() => {
        socket.emit("typing:stop", { receiverId: recipient.id });
      }, 1500);
    }
  }

  async function handleSend() {
    if (!text.trim() || !recipient) return;
    if (socket && recipient) {
      socket.emit("typing:stop", { receiverId: recipient.id });
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
    }
    setSending(true);
    setError("");
    try {
      if (!recipient.publicKey) {
        setError("У получателя нет ключа шифрования");
        setSending(false);
        return;
      }
      const privKey = loadPrivateKey();
      if (!privKey) {
        setError("Ключ не загружен — войдите заново");
        setSending(false);
        return;
      }
      const { content, nonce } = encryptMessage(text.trim(), recipient.publicKey, privKey);
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: recipient.id, content, nonce }),
      });
      if (!res.ok) { setError("Ошибка отправки"); setSending(false); return; }
      const message = await res.json();
      onMessageSent(recipient.id, message);
      onClose();
    } catch {
      setError("Ошибка отправки");
      setSending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: "linear-gradient(180deg, #14100a, #1a1008 40%, #0d0805)",
      }}
    >
      {/* Header */}
      <header
        className="pt-safe"
        style={{
          background: "linear-gradient(180deg, #2a1a10, #1a1008)",
          borderBottom: "1px solid rgba(218,165,32,0.25)",
        }}
      >
        <div className="flex items-center gap-3 px-4" style={{ height: 52 }}>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="tap-target no-select"
            style={{
              width: 40, height: 40,
              background: "rgba(218,165,32,0.08)",
              border: "1px solid rgba(218,165,32,0.25)",
              borderRadius: 6,
              color: "#DAA520",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
          <div className="flex-1 min-w-0">
            <div
              className="font-typewriter text-xs tracking-[0.25em] uppercase"
              style={{ color: "#DAA520" }}
            >
              {step === "recipient" ? "Новое сообщение" : "Передача"}
            </div>
            {recipient && step === "compose" && (
              <div className="font-courier text-[11px] truncate" style={{ color: "#8a7050" }}>
                → {recipient.name} · {recipient.phone}
              </div>
            )}
          </div>
          {step === "compose" && (
            <button
              onClick={() => { setStep("recipient"); setRecipient(null); }}
              className="font-typewriter text-[10px] tap-target no-select px-2"
              style={{
                background: "transparent",
                color: "#8a6a4a",
                border: "1px solid #3a2a18",
                borderRadius: 4,
                cursor: "pointer",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                height: 40,
              }}
            >
              ← Изм.
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {step === "recipient" && (
          <div className="p-5 space-y-5">
            {/* Switchboard-style frame */}
            <div
              className="relative"
              style={{
                background: "linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)",
                border: "2px solid #3a3a3a",
                borderRadius: 8,
                padding: "14px 14px 16px",
                boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)",
              }}
            >
              <div className="flex items-baseline justify-between mb-3">
                <span
                  className="font-typewriter tracking-widest uppercase"
                  style={{ color: "#DAA520", fontSize: 10 }}
                >
                  Коммутатор · Линия
                </span>
                <span
                  className="font-courier"
                  style={{
                    color: lookupBusy ? "#DAA520" : "#8a6a4a",
                    fontSize: 9,
                    letterSpacing: "0.1em",
                  }}
                >
                  {lookupBusy ? "◐ СОЕДИНЕНИЕ…" : "○ НЕ ПОДКЛЮЧЕНО"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Cable plug */}
                <motion.div
                  animate={lookupBusy ? { scale: [1, 1.06, 1] } : {}}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    background: "linear-gradient(135deg, #cc3300, #881100)",
                    border: "3px solid #441100",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
                  }}
                />

                {/* Cable "wire" */}
                <svg width="32" height="18" className="flex-shrink-0" style={{ overflow: "visible" }}>
                  <path
                    d="M 0 9 Q 16 22 32 9"
                    stroke="#cc3300"
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Socket / input */}
                <div className="flex-1 min-w-0">
                  <label
                    className="block font-typewriter tracking-widest uppercase mb-1"
                    style={{ color: "#8a6a4a", fontSize: 9 }}
                  >
                    Номер абонента
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+7 900 123 45 67"
                    autoFocus={!prefilledPhone}
                    className="w-full font-courier rounded focus:outline-none"
                    style={{
                      background: "#0a0603",
                      border: "2px solid #0d0805",
                      color: "#DAA520",
                      fontSize: 16,
                      padding: "10px 12px",
                      letterSpacing: "0.1em",
                      boxShadow: "inset 0 2px 5px rgba(0,0,0,0.8)",
                    }}
                  />
                </div>
              </div>

              <p
                className="font-courier mt-3 text-center"
                style={{ color: "#6a5030", fontSize: 9, letterSpacing: "0.05em" }}
              >
                Введите номер и нажмите «Подключить», чтобы открыть линию
              </p>
            </div>

            {error && (
              <p
                className="font-typewriter text-xs text-center py-2 rounded"
                style={{ color: "#FF6644", background: "rgba(60,10,10,0.2)", border: "1px solid #8B1A1A" }}
              >
                {error}
              </p>
            )}

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleLookup}
              disabled={!phone.trim() || lookupBusy}
              className="w-full font-typewriter tracking-wider tap-target no-select"
              style={{
                background: phone.trim() && !lookupBusy
                  ? "linear-gradient(135deg, #B8860B, #DAA520)"
                  : "#2a1a10",
                color: phone.trim() && !lookupBusy ? "#1a1008" : "#555",
                border: "none",
                borderRadius: 8,
                padding: "16px",
                fontSize: 14,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: phone.trim() && !lookupBusy ? "pointer" : "not-allowed",
                fontWeight: "bold",
              }}
            >
              {lookupBusy ? "Проверка..." : "→ Подключить"}
            </motion.button>
          </div>
        )}

        {step === "compose" && recipient && (
          <div className="p-3 flex flex-col" style={{ minHeight: "100%" }}>
            {/* Channel-open banner */}
            <div
              className="flex items-center gap-2 mb-2 px-3 py-2 rounded"
              style={{
                background: "linear-gradient(180deg, rgba(34,139,34,0.12), rgba(34,139,34,0.04))",
                border: "1px solid rgba(34,139,34,0.3)",
              }}
            >
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#22BB22",
                  boxShadow: "0 0 6px #22BB22",
                  flexShrink: 0,
                }}
              />
              <span
                className="font-typewriter tracking-widest uppercase"
                style={{ color: "#90EE90", fontSize: 9 }}
              >
                Канал открыт
              </span>
              <span
                className="font-courier truncate flex-1"
                style={{ color: "#8a7050", fontSize: 10 }}
              >
                → {recipient.phone}
              </span>
            </div>

            <div
              className="relative flex-1"
              style={{
                background: "linear-gradient(180deg, #f5f0e0 0%, #ede5c8 40%, #e6dab8 100%)",
                borderRadius: 6,
                boxShadow: "inset 0 0 24px rgba(100,70,20,0.1), 0 4px 16px rgba(0,0,0,0.4)",
                filter: "sepia(4%)",
                display: "flex",
                flexDirection: "column",
                minHeight: 320,
                padding: 4,
              }}
            >
              {/* Paper lines background */}
              <div
                className="absolute inset-4 pointer-events-none"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(180deg, transparent 0, transparent 23px, rgba(100,150,200,0.12) 23px, rgba(100,150,200,0.12) 24px)",
                }}
              />
              <textarea
                value={text}
                onChange={e => handleTextChange(e.target.value)}
                placeholder="Начните печатать сообщение..."
                className="relative flex-1 bg-transparent font-typewriter resize-none focus:outline-none"
                style={{
                  color: "#1a1008",
                  fontSize: 16,
                  lineHeight: "24px",
                  letterSpacing: "0.03em",
                  padding: "16px",
                  minHeight: 280,
                }}
                spellCheck={false}
                maxLength={16384}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between mt-2 px-1">
              <span className="font-typewriter text-[10px]" style={{ color: "#5a4020" }}>
                {text.length} / 16384 симв.
              </span>
              {peerTyping && (
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="font-typewriter text-[10px]"
                  style={{ color: "#DAA520", letterSpacing: "0.1em" }}
                >
                  📡 {recipient.name} печатает...
                </motion.span>
              )}
              {text && !peerTyping && (
                <button
                  onClick={() => setText("")}
                  className="font-typewriter text-[10px] tap-target no-select px-2"
                  style={{
                    background: "rgba(139,26,26,0.15)",
                    color: "#CC6666",
                    border: "1px solid rgba(139,26,26,0.4)",
                    borderRadius: 4,
                    cursor: "pointer",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    height: 32,
                  }}
                >
                  Чистый лист
                </button>
              )}
            </div>

            {error && (
              <p
                className="font-typewriter text-xs text-center mt-3 py-2 rounded"
                style={{ color: "#FF6644", background: "rgba(60,10,10,0.2)", border: "1px solid #8B1A1A" }}
              >
                {error}
              </p>
            )}
          </div>
        )}
      </main>

      {/* Send bar */}
      {step === "compose" && (
        <footer
          className="pb-safe"
          style={{
            background: "linear-gradient(180deg, #1a1008, #0d0805)",
            borderTop: "1px solid rgba(218,165,32,0.25)",
          }}
        >
          <div className="px-4 py-3">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-full font-typewriter tracking-widest tap-target no-select"
              style={{
                background: text.trim() && !sending
                  ? "linear-gradient(135deg, #B8860B, #DAA520)"
                  : "#2a1a10",
                color: text.trim() && !sending ? "#1a1008" : "#555",
                border: "none",
                borderRadius: 8,
                padding: "16px",
                fontSize: 14,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: text.trim() && !sending ? "pointer" : "not-allowed",
                fontWeight: "bold",
              }}
            >
              {sending ? "▲ Передача..." : "▲ Отправить"}
            </motion.button>
          </div>
        </footer>
      )}
    </motion.div>
  );
}
