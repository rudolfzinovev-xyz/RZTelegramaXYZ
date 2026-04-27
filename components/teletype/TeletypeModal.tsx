"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Switchboard } from "./Switchboard";
import { Typewriter } from "./Typewriter";
import { Socket } from "socket.io-client";
import { encryptMessage, loadPrivateKey } from "@/lib/crypto";

interface TeletypeModalProps {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  onMessageSent: (receiverId: string, message: any) => void;
  prefilledPhone?: string;
  socket?: Socket;
}

type Step = "switchboard" | "typewriter";

export function TeletypeModal({ open, onClose, currentUserId, onMessageSent, prefilledPhone, socket }: TeletypeModalProps) {
  const [step, setStep] = useState<Step>("switchboard");
  const [recipientPhone, setRecipientPhone] = useState(prefilledPhone || "");
  const [recipientInfo, setRecipientInfo] = useState<{ id: string; name: string; phone: string; publicKey?: string | null; isBot?: boolean } | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const typingStopRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for peer typing events
  useEffect(() => {
    if (!socket || !recipientInfo) return;
    const onTyping = ({ senderId }: { senderId: string }) => {
      if (senderId === recipientInfo.id) setPeerTyping(true);
    };
    const onTypingStopped = ({ senderId }: { senderId: string }) => {
      if (senderId === recipientInfo.id) setPeerTyping(false);
    };
    socket.on("typing:receive", onTyping);
    socket.on("typing:stopped", onTypingStopped);
    return () => {
      socket.off("typing:receive", onTyping);
      socket.off("typing:stopped", onTypingStopped);
    };
  }, [socket, recipientInfo?.id]);

  async function handleConnect(phone: string) {
    setError("");
    try {
      const res = await fetch(`/api/users?phone=${encodeURIComponent(phone)}`);
      if (!res.ok) { setError("Абонент не найден"); return; }
      const user = await res.json();
      setRecipientInfo(user);
      setRecipientPhone(phone);
      setStep("typewriter");
    } catch {
      setError("Ошибка соединения");
    }
  }

  function handleTextChange(newText: string) {
    setText(newText);
    if (socket && recipientInfo) {
      socket.emit("typing:start", { receiverId: recipientInfo.id });
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      typingStopRef.current = setTimeout(() => {
        socket.emit("typing:stop", { receiverId: recipientInfo.id });
      }, 1500);
    }
  }

  async function handleSend() {
    if (!text.trim() || !recipientInfo) return;
    // Stop typing indicator
    if (socket && recipientInfo) {
      socket.emit("typing:stop", { receiverId: recipientInfo.id });
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
    }
    setSending(true);
    setError("");
    try {
      let payload: { receiverId: string; content: string; nonce: string | null };
      if (recipientInfo.isBot) {
        // Bots receive plaintext (no E2E, server can read).
        payload = { receiverId: recipientInfo.id, content: text.trim(), nonce: null };
      } else {
        if (!recipientInfo.publicKey) {
          setError("У получателя нет ключа шифрования");
          setSending(false);
          return;
        }
        const privKey = loadPrivateKey();
        if (!privKey) {
          setError("Ключ шифрования не загружен — войдите заново");
          setSending(false);
          return;
        }
        const { content, nonce } = encryptMessage(text.trim(), recipientInfo.publicKey, privKey);
        payload = { receiverId: recipientInfo.id, content, nonce };
      }
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { setError("Ошибка отправки"); setSending(false); return; }
      const message = await res.json();
      onMessageSent(recipientInfo.id, message);
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setText("");
        setStep("switchboard");
        setRecipientInfo(null);
        onClose();
      }, 1500);
    } catch {
      setError("Ошибка отправки");
    }
    setSending(false);
  }

  function handleClose() {
    if (socket && recipientInfo) {
      socket.emit("typing:stop", { receiverId: recipientInfo.id });
    }
    setText("");
    setStep("switchboard");
    setRecipientInfo(null);
    setError("");
    setSent(false);
    setPeerTyping(false);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.8)" }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg mx-4"
            style={{
              background: "linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)",
              borderRadius: "8px",
              border: "3px solid #3a3a3a",
              boxShadow: "8px 16px 48px rgba(0,0,0,0.8)",
              overflow: "hidden",
            }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ background: "linear-gradient(180deg, #888, #555)", borderBottom: "2px solid #3a3a3a" }}
            >
              <div className="flex items-center gap-3">
                <div className="font-typewriter text-[#DAA520] tracking-widest uppercase text-sm">
                  ТЕЛЕТАЙП RZ-T1
                </div>
                {step === "typewriter" && recipientInfo && (
                  <span className="font-courier text-xs text-[#aaa]">
                    → {recipientInfo.name} ({recipientInfo.phone})
                  </span>
                )}
              </div>
              <button
                onClick={handleClose}
                className="font-typewriter text-[#aaa] hover:text-white text-lg w-8 h-8 flex items-center justify-center"
                style={{ background: "#333", borderRadius: "50%", border: "1px solid #555" }}
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Step indicator */}
              <div className="flex gap-4 mb-5">
                {(["switchboard", "typewriter"] as Step[]).map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center font-typewriter text-xs"
                      style={{
                        background: step === s ? "#DAA520" : s === "typewriter" && step === "typewriter" ? "#DAA520" : "#333",
                        color: step === s ? "#1a1008" : "#666",
                        border: "1px solid #555",
                      }}
                    >
                      {i + 1}
                    </div>
                    <span className="font-typewriter text-[10px] uppercase tracking-wider" style={{ color: step === s ? "#DAA520" : "#555" }}>
                      {s === "switchboard" ? "Коммутатор" : "Печатать"}
                    </span>
                  </div>
                ))}
              </div>

              {step === "switchboard" && (
                <Switchboard onConnect={handleConnect} prefilledPhone={prefilledPhone} />
              )}

              {step === "typewriter" && (
                <div>
                  <Typewriter value={text} onChange={handleTextChange} />

                  {/* Peer typing indicator */}
                  <AnimatePresence>
                    {peerTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-2 font-typewriter text-[10px] tracking-wider"
                        style={{ color: "#DAA520" }}
                      >
                        📡 {recipientInfo?.name} печатает...
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => { setStep("switchboard"); setRecipientInfo(null); }}
                      className="font-typewriter text-xs tracking-wider uppercase px-3 py-2"
                      style={{ background: "#2a2a2a", color: "#888", border: "1px solid #444", borderRadius: "4px", cursor: "pointer" }}
                    >
                      ← Назад
                    </button>

                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSend}
                      disabled={!text.trim() || sending}
                      className="font-typewriter text-sm tracking-widest uppercase px-6 py-2"
                      style={{
                        background: text.trim() && !sending
                          ? "linear-gradient(135deg, #B8860B, #DAA520)"
                          : "#333",
                        color: text.trim() && !sending ? "#1a1008" : "#555",
                        border: "none",
                        borderRadius: "4px",
                        cursor: text.trim() && !sending ? "pointer" : "not-allowed",
                      }}
                    >
                      {sending ? "Передача..." : "Отправить сообщение"}
                    </motion.button>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {sent && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center mt-4 py-3 font-typewriter text-sm tracking-widest uppercase"
                    style={{ color: "#DAA520", border: "1px solid #DAA520", borderRadius: "4px", background: "rgba(218,165,32,0.08)" }}
                  >
                    ✓ Передача завершена
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <p className="text-red-400 text-xs font-typewriter text-center mt-3">{error}</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
