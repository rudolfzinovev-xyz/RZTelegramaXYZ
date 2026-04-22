"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const LINE_KEY = "rz:phone_line";

interface RotaryPhoneProps {
  callState: "idle" | "incoming" | "outgoing" | "connected";
  remoteUser?: { name: string; phone: string };
  timezone: string;
  onPickUp: () => void;
  onOpen: () => void;
}

function handsetAnimate(callState: string) {
  if (callState === "incoming") {
    return {
      x: [0, -5, 6, -4, 5, -3, 0],
      y: [0, -4, 3, -5, 2, -3, 0],
      rotate: [0, -8, 9, -7, 8, -6, 0],
    };
  }
  if (callState === "connected") return { x: -38, y: -72, rotate: -48 };
  if (callState === "outgoing") return { x: 0, y: -12, rotate: -10 };
  return { x: 0, y: 0, rotate: 0 };
}

function handsetTransition(callState: string) {
  if (callState === "incoming") {
    return { duration: 0.42, repeat: Infinity, repeatType: "loop" as const };
  }
  return { type: "spring" as const, stiffness: 180, damping: 18 };
}

export function RotaryPhone({ callState, remoteUser, timezone, onPickUp, onOpen }: RotaryPhoneProps) {
  const [currentLine, setCurrentLine] = useState<string | null>(null);
  useEffect(() => {
    setCurrentLine(localStorage.getItem(LINE_KEY));
    const sync = () => setCurrentLine(localStorage.getItem(LINE_KEY));
    window.addEventListener("storage", sync);
    window.addEventListener("rz:line_changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("rz:line_changed", sync);
    };
  }, []);

  const isRinging = callState === "incoming";
  const isConnected = callState === "connected";
  const isOutgoing = callState === "outgoing";
  const isActive = callState !== "idle";

  function handleBodyClick() {
    if (callState === "idle") onOpen();
  }

  return (
    <div className="relative select-none" style={{ width: 200 }}>
      {/* Whole phone body — clickable only when idle */}
      <motion.div
        className="relative"
        style={{ width: 200, height: 180, cursor: callState === "idle" ? "pointer" : "default" }}
        whileHover={callState === "idle" ? { scale: 1.02 } : {}}
        whileTap={callState === "idle" ? { scale: 0.98 } : {}}
        animate={isRinging ? { rotate: [-1.5, 1.5, -1.5, 1.5, 0] } : {}}
        transition={isRinging ? { duration: 0.35, repeat: Infinity } : {}}
        onClick={handleBodyClick}
      >
        {/* Cradle body */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: 130,
            background: "linear-gradient(135deg, #2a1f0e 0%, #1a1008 40%, #0f0805 100%)",
            borderRadius: "12px 12px 8px 8px",
            boxShadow: "4px 8px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
            border: "2px solid #0d0805",
          }}
        >
          {/* Rotary dial */}
          <div
            className="absolute"
            style={{
              width: 90, height: 90,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #3a2a1a 0%, #1a1008 50%, #2a1a08 100%)",
              border: "3px solid #0d0805",
              boxShadow: "inset 0 2px 6px rgba(255,255,255,0.05), 0 3px 8px rgba(0,0,0,0.6)",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            {Array.from({ length: 10 }).map((_, i) => {
              const angle = (i * 36 - 90) * (Math.PI / 180);
              const r = 33;
              const x = 45 + r * Math.cos(angle);
              const y = 45 + r * Math.sin(angle);
              return (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{ width: 10, height: 10, background: "#0a0805", border: "1px solid #1a1008", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.8)", left: x - 5, top: y - 5 }}
                >
                  <span className="absolute text-[6px] font-typewriter" style={{ color: "#6b5030", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
                    {i === 0 ? "0" : i}
                  </span>
                </div>
              );
            })}
            <div className="absolute rounded-full" style={{ width: 16, height: 16, background: "linear-gradient(135deg, #5a3a1a, #2a1008)", border: "2px solid #0d0805", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
          </div>

          <div className="absolute bottom-2 left-0 right-0 text-center font-typewriter text-[8px] tracking-widest" style={{ color: "#5a3a1a" }}>
            RZ-TEL
          </div>
        </div>

        {/* Handset — clickable when incoming or connected */}
        <motion.div
          className="absolute"
          style={{
            width: 160, height: 45,
            top: 5, left: 20,
            background: isConnected
              ? "linear-gradient(180deg, #1a3a1a 0%, #0d1a0d 100%)"
              : "linear-gradient(180deg, #2a1f0e 0%, #1a1008 100%)",
            borderRadius: "30px 30px 20px 20px",
            boxShadow: isConnected
              ? "2px 4px 14px rgba(34,139,34,0.4)"
              : "2px 4px 10px rgba(0,0,0,0.6)",
            border: `2px solid ${isConnected ? "#1a4a1a" : "#0d0805"}`,
            cursor: isRinging || isConnected ? "pointer" : "default",
            zIndex: 10,
            originX: 0.5,
            originY: 0.5,
          }}
          animate={handsetAnimate(callState)}
          transition={handsetTransition(callState)}
          onClick={(e) => {
            if (isRinging || isConnected || isOutgoing) {
              e.stopPropagation();
              onPickUp();
            }
          }}
          title={isRinging ? "Поднять трубку" : (isConnected || isOutgoing) ? "Положить трубку" : undefined}
        >
          {/* Earpiece */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex gap-[3px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ width: 2, height: 20, background: "#0d0805", borderRadius: 1 }} />
            ))}
          </div>
          {/* Microphone */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-[3px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ width: 2, height: 20, background: "#0d0805", borderRadius: 1 }} />
            ))}
          </div>

          {/* Pickup / hangup hint */}
          {(isRinging || isOutgoing) && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.7, repeat: Infinity }}
              className="absolute inset-0 flex items-center justify-center"
              style={{ borderRadius: "inherit" }}
            >
              <span className="font-typewriter text-[8px] tracking-widest" style={{ color: "#DAA520" }}>
                {isRinging ? "ПОДНЯТЬ" : "ПОЛОЖИТЬ"}
              </span>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Line indicator */}
      <div className="flex items-center justify-center gap-1.5 mt-1">
        <motion.div
          animate={currentLine ? { opacity: [0.6, 1, 0.6] } : { opacity: 1 }}
          transition={currentLine ? { duration: 1.5, repeat: Infinity } : {}}
          style={{
            width: 6, height: 6, borderRadius: "50%",
            background: currentLine ? "#228B22" : "#333",
            boxShadow: currentLine ? "0 0 5px #22BB22" : "none",
          }}
        />
        <span className="font-typewriter text-[9px] tracking-widest" style={{ color: currentLine ? "#228B22" : "#5a3a1a" }}>
          {currentLine ? `ЛИНИЯ ${currentLine}` : "НЕТ ЛИНИИ"}
        </span>
      </div>

      {/* Label / status */}
      <div className="text-center font-typewriter text-xs tracking-widest mt-0.5" style={{ color: isConnected ? "#228B22" : "#DAA520" }}>
        {isConnected && remoteUser
          ? remoteUser.name
          : isRinging && remoteUser
          ? `☏ ${remoteUser.name}`
          : isOutgoing && remoteUser
          ? `⟳ ${remoteUser.name}`
          : "ТЕЛЕФОН"}
      </div>
    </div>
  );
}
