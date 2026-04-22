"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RotaryDial } from "@/components/phone/RotaryDial";
import { MobileSwitchboard } from "./MobileSwitchboard";

const LINE_KEY = "rz:phone_line";

interface Props {
  homeLine: number;
  onDial: (phone: string, line?: string) => void;
  callState: "idle" | "outgoing" | "incoming" | "connected";
}

export function PhoneTab({ homeLine, onDial, callState }: Props) {
  const homeLineStr = String(homeLine);
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setLine(typeof window !== "undefined" ? localStorage.getItem(LINE_KEY) : null);
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("rz:line_changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("rz:line_changed", sync);
    };
  }, []);

  function handleRotaryDial(phone: string) {
    if (!phone || callState !== "idle") return;
    onDial(phone, line ?? undefined);
  }

  const hint =
    callState !== "idle"
      ? "● Линия занята"
      : !line
      ? "Подключите кабель к линии собеседника"
      : `Выбрана: ЛИНИЯ ${line}  ·  Ваша: Л${homeLineStr}`;

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Switchboard */}
      <div className="px-4 pt-3">
        <MobileSwitchboard homeLine={homeLine} />
      </div>

      <div className="px-4 pt-2">
        <div
          className="font-courier text-center"
          style={{
            color: callState !== "idle"
              ? "#CC6666"
              : line
              ? "#8a7050"
              : "#8B1A1A",
            fontSize: 10,
            letterSpacing: "0.1em",
          }}
        >
          {hint}
        </div>
      </div>

      {/* Rotary phone body + dial */}
      <div className="mt-4 px-3">
        <div
          className="relative mx-auto"
          style={{
            maxWidth: 360,
            background: "linear-gradient(180deg, #2a1f0e 0%, #1a1008 45%, #0f0805 100%)",
            borderRadius: 16,
            border: "2px solid #0d0805",
            boxShadow:
              "0 10px 28px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
            padding: "14px 14px 18px",
          }}
        >
          {/* Handset bar (decorative) */}
          <motion.div
            animate={
              callState === "incoming"
                ? { rotate: [-2, 2, -2, 2, 0] }
                : callState === "connected"
                ? { y: -8, rotate: -6 }
                : {}
            }
            transition={
              callState === "incoming"
                ? { duration: 0.4, repeat: Infinity }
                : { type: "spring", stiffness: 180, damping: 18 }
            }
            className="relative mx-auto"
            style={{
              width: "88%",
              height: 36,
              background:
                callState === "connected"
                  ? "linear-gradient(180deg, #1a3a1a 0%, #0d1a0d 100%)"
                  : "linear-gradient(180deg, #2a1f0e 0%, #1a1008 100%)",
              borderRadius: "24px 24px 14px 14px",
              border: `2px solid ${callState === "connected" ? "#1a4a1a" : "#0d0805"}`,
              boxShadow:
                callState === "connected"
                  ? "0 3px 10px rgba(34,139,34,0.35)"
                  : "0 3px 8px rgba(0,0,0,0.6)",
              marginBottom: 10,
            }}
          >
            {/* Earpiece */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex gap-[3px]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{ width: 2, height: 14, background: "#0d0805", borderRadius: 1 }}
                />
              ))}
            </div>
            {/* Microphone */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-[3px]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{ width: 2, height: 14, background: "#0d0805", borderRadius: 1 }}
                />
              ))}
            </div>
          </motion.div>

          {/* RotaryDial */}
          <div className="flex justify-center">
            <RotaryDial onDial={handleRotaryDial} />
          </div>

          {/* Label */}
          <div
            className="mt-3 text-center font-typewriter tracking-widest"
            style={{
              color:
                callState === "connected"
                  ? "#228B22"
                  : callState === "incoming"
                  ? "#DAA520"
                  : "#DAA520",
              fontSize: 10,
            }}
          >
            {callState === "connected"
              ? "НА ЛИНИИ"
              : callState === "outgoing"
              ? "НАБОР НОМЕРА"
              : callState === "incoming"
              ? "ВХОДЯЩИЙ"
              : "RZ-TEL"}
          </div>
        </div>
      </div>
    </div>
  );
}
