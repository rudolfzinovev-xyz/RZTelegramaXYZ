"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CallModalProps {
  state: "idle" | "outgoing" | "incoming" | "connected";
  remoteUser?: { name: string; phone: string };
  onHangup: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
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

export function CallModal({ state, remoteUser, onHangup, localStream, remoteStream }: CallModalProps) {
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const bellCtxRef = useRef<AudioContext | null>(null);
  const bellTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (state === "connected") {
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state]);

  // Bell ring while incoming
  useEffect(() => {
    if (state !== "incoming") {
      if (bellTimerRef.current) clearInterval(bellTimerRef.current);
      bellCtxRef.current?.close();
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
      bellCtxRef.current?.close();
      bellCtxRef.current = null;
    };
  }, [state]);

  function fmt(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  return (
    <>
      {/* Hidden audio element — always present during call */}
      {state !== "idle" && <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />}

      {/* Connected — small duration ticker near phone */}
      <AnimatePresence>
        {state === "connected" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-2 rounded"
            style={{
              background: "rgba(0,20,0,0.85)",
              border: "1px solid #228B22",
              boxShadow: "0 0 12px rgba(34,139,34,0.3)",
            }}
          >
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: "#22BB22" }}
            />
            <span className="font-courier text-sm" style={{ color: "#90EE90" }}>{fmt(duration)}</span>
            {remoteUser && (
              <span className="font-typewriter text-xs" style={{ color: "#6aaa6a" }}>{remoteUser.name}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
