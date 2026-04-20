"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  state: "outgoing" | "incoming" | "connected" | "idle";
  remoteUser?: { id: string; name: string; phone: string };
  remoteStream: MediaStream | null;
  onAccept: () => void;
  onReject: () => void;
  onHangup: () => void;
}

function playBell(ctx: AudioContext, t: number) {
  [[880, 0], [660, 0.18]].forEach(([freq, offset]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t + offset);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + offset + 0.6);
    gain.gain.setValueAtTime(0.25, t + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.7);
    osc.start(t + offset); osc.stop(t + offset + 0.7);
  });
}

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function CallScreen({ state, remoteUser, remoteStream, onAccept, onReject, onHangup }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const bellCtxRef = useRef<AudioContext | null>(null);
  const bellTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (remoteStream && audioRef.current) {
      audioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (state === "connected") {
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  useEffect(() => {
    if (state !== "incoming") {
      if (bellTimerRef.current) clearInterval(bellTimerRef.current);
      bellCtxRef.current?.close().catch(() => {});
      bellCtxRef.current = null;
      return;
    }
    try {
      const ctx = new AudioContext();
      bellCtxRef.current = ctx;
      const ring = () => playBell(ctx, ctx.currentTime);
      ring();
      bellTimerRef.current = setInterval(ring, 2200);
    } catch { /* audio not available */ }
    return () => {
      if (bellTimerRef.current) clearInterval(bellTimerRef.current);
      bellCtxRef.current?.close().catch(() => {});
      bellCtxRef.current = null;
    };
  }, [state]);

  const statusText =
    state === "outgoing" ? "Соединение..." :
    state === "incoming" ? "Входящий вызов" :
    state === "connected" ? fmt(duration) :
    "";

  const statusColor =
    state === "outgoing" ? "#DAA520" :
    state === "incoming" ? "#90EE90" :
    state === "connected" ? "#90EE90" :
    "#8a6a4a";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col"
      style={{
        background: "radial-gradient(ellipse at 50% 20%, #1a1408 0%, #0a0603 80%)",
      }}
    >
      {state !== "idle" && (
        <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />
      )}

      {/* Header / status */}
      <header className="pt-safe">
        <div className="px-5 pt-6 pb-2 text-center">
          <div
            className="font-typewriter tracking-[0.3em] uppercase"
            style={{ color: statusColor, fontSize: 11 }}
          >
            {state === "outgoing" && "● Исходящий"}
            {state === "incoming" && "● Входящий"}
            {state === "connected" && "● На линии"}
          </div>
        </div>
      </header>

      {/* Caller card */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Avatar */}
        <motion.div
          animate={
            state === "outgoing" || state === "incoming"
              ? { scale: [1, 1.06, 1] }
              : {}
          }
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center justify-center rounded-full font-typewriter"
          style={{
            width: 160,
            height: 160,
            background: "linear-gradient(135deg, #B8860B, #DAA520, #8a6608)",
            color: "#1a1008",
            fontSize: 72,
            fontWeight: "bold",
            border: "3px solid #5a4008",
            boxShadow:
              state === "incoming"
                ? "0 0 48px rgba(34,139,34,0.45), inset 0 0 24px rgba(0,0,0,0.3)"
                : state === "outgoing"
                ? "0 0 48px rgba(218,165,32,0.35), inset 0 0 24px rgba(0,0,0,0.3)"
                : "0 0 32px rgba(34,139,34,0.25), inset 0 0 24px rgba(0,0,0,0.3)",
          }}
        >
          {remoteUser?.name.charAt(0).toUpperCase() || "?"}
        </motion.div>

        {/* Name + phone */}
        <div className="mt-8 text-center">
          <div
            className="font-typewriter"
            style={{ color: "#f5e8c8", fontSize: 26, letterSpacing: "0.05em" }}
          >
            {remoteUser?.name || "Неизвестный"}
          </div>
          {remoteUser?.phone && (
            <div
              className="font-courier mt-1"
              style={{ color: "#8a7050", fontSize: 14, letterSpacing: "0.1em" }}
            >
              {remoteUser.phone}
            </div>
          )}
        </div>

        {/* Status line */}
        <div className="mt-10 text-center">
          {state === "connected" ? (
            <div className="flex items-center justify-center gap-2">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{ width: 8, height: 8, borderRadius: "50%", background: "#22BB22" }}
              />
              <span
                className="font-courier"
                style={{ color: "#90EE90", fontSize: 24, letterSpacing: "0.15em" }}
              >
                {statusText}
              </span>
            </div>
          ) : (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="font-typewriter tracking-widest uppercase"
              style={{ color: statusColor, fontSize: 13 }}
            >
              {statusText}
            </motion.div>
          )}
        </div>
      </main>

      {/* Call actions */}
      <footer className="pb-safe">
        <div className="px-6 pb-8 pt-4">
          {state === "incoming" ? (
            <div className="flex items-center justify-around gap-4 max-w-md mx-auto">
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onReject}
                  aria-label="Отклонить"
                  className="tap-target no-select"
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #8B1A1A, #5a1010)",
                    border: "2px solid #8B1A1A",
                    color: "#f5e8c8",
                    fontSize: 30,
                    cursor: "pointer",
                    boxShadow: "0 0 24px rgba(139,26,26,0.5)",
                  }}
                >
                  ✕
                </motion.button>
                <span
                  className="font-typewriter text-[10px] uppercase"
                  style={{ color: "#8a6a4a", letterSpacing: "0.15em" }}
                >
                  Отклонить
                </span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  onClick={onAccept}
                  aria-label="Принять"
                  className="tap-target no-select"
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #228B22, #0a5a0a)",
                    border: "2px solid #228B22",
                    color: "#f5e8c8",
                    fontSize: 36,
                    cursor: "pointer",
                    boxShadow: "0 0 32px rgba(34,139,34,0.6)",
                  }}
                >
                  ☎
                </motion.button>
                <span
                  className="font-typewriter text-[10px] uppercase"
                  style={{ color: "#90EE90", letterSpacing: "0.15em" }}
                >
                  Принять
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onHangup}
                aria-label={state === "outgoing" ? "Отменить" : "Положить трубку"}
                className="tap-target no-select"
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #8B1A1A, #5a1010)",
                  border: "2px solid #8B1A1A",
                  color: "#f5e8c8",
                  fontSize: 36,
                  cursor: "pointer",
                  boxShadow: "0 0 28px rgba(139,26,26,0.55)",
                }}
              >
                ☎
              </motion.button>
              <span
                className="font-typewriter text-[10px] uppercase mt-1"
                style={{ color: "#CC6666", letterSpacing: "0.15em" }}
              >
                {state === "outgoing" ? "Отменить" : "Завершить"}
              </span>
            </div>
          )}
        </div>
      </footer>
    </motion.div>
  );
}
