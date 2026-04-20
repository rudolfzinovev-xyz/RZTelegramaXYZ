"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const LINE_KEY = "rz:phone_line";

const TIMEZONES = [
  "UTC-12", "UTC-10", "UTC-8", "UTC-6", "UTC-4", "UTC-2",
  "UTC+0", "UTC+1", "UTC+2", "UTC+3", "UTC+4", "UTC+5",
  "UTC+6", "UTC+7", "UTC+8", "UTC+9", "UTC+10", "UTC+12",
];

interface Props {
  homeTimezone: string;
}

function playPlugSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(90, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12);
  } catch { /* audio not available */ }
}

export function MobileSwitchboard({ homeTimezone }: Props) {
  const [line, setLine] = useState<string | null>(null);
  const [cableEnd, setCableEnd] = useState<{ x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const socketRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    setLine(typeof window !== "undefined" ? localStorage.getItem(LINE_KEY) : null);
  }, []);

  // Recompute cable end position when line changes or on resize
  useEffect(() => {
    if (!line) { setCableEnd(null); return; }
    const recompute = () => {
      const socket = socketRefs.current.get(line);
      const board = boardRef.current;
      if (!socket || !board) return;
      const sr = socket.getBoundingClientRect();
      const br = board.getBoundingClientRect();
      setCableEnd({
        x: sr.left - br.left + sr.width / 2,
        y: sr.top - br.top + sr.height / 2,
      });
    };
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [line]);

  function togglePlug(tz: string) {
    playPlugSound();
    const next = line === tz ? null : tz;
    setLine(next);
    if (typeof window !== "undefined") {
      if (next) localStorage.setItem(LINE_KEY, next);
      else localStorage.removeItem(LINE_KEY);
      window.dispatchEvent(new CustomEvent("rz:line_changed", { detail: next }));
    }
  }

  // Source plug fixed on left
  const plugX = 28;
  const plugY = 48;

  return (
    <div
      ref={boardRef}
      className="relative"
      style={{
        background: "linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)",
        border: "2px solid #3a3a3a",
        borderRadius: 8,
        padding: "12px 14px 14px",
        boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)",
      }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <span
          className="font-typewriter tracking-widest uppercase"
          style={{ color: "#DAA520", fontSize: 10 }}
        >
          КОММУТАТОР
        </span>
        <span
          className="font-courier"
          style={{ color: line ? "#228B22" : "#8B1A1A", fontSize: 9, letterSpacing: "0.1em" }}
        >
          {line ? `● ${line}` : "○ НЕТ ЛИНИИ"}
        </span>
      </div>

      {/* Sockets + source plug row */}
      <div className="relative flex items-start gap-3">
        {/* Source plug */}
        <div
          className="flex flex-col items-center flex-shrink-0"
          style={{ width: 48 }}
        >
          <motion.div
            animate={line ? { scale: [1, 1.04, 1] } : {}}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="rounded-full"
            style={{
              width: 32,
              height: 32,
              background: "linear-gradient(135deg, #cc3300, #881100)",
              border: "3px solid #441100",
              boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
            }}
          />
          <span
            className="font-typewriter mt-1"
            style={{ color: "#666", fontSize: 7, letterSpacing: "0.15em" }}
          >
            КАБЕЛЬ
          </span>
        </div>

        {/* Socket grid */}
        <div
          className="flex-1 grid gap-x-2 gap-y-2"
          style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}
        >
          {TIMEZONES.map(tz => {
            const active = line === tz;
            const home = tz === homeTimezone;
            return (
              <button
                key={tz}
                onClick={() => togglePlug(tz)}
                className="flex flex-col items-center gap-1 no-select tap-target"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  minHeight: 0,
                  minWidth: 0,
                }}
                aria-label={`Подключить канал ${tz}`}
              >
                <div
                  ref={(el) => {
                    if (el) socketRefs.current.set(tz, el);
                    else socketRefs.current.delete(tz);
                  }}
                  className="rounded-full flex items-center justify-center transition-all"
                  style={{
                    width: 22,
                    height: 22,
                    background: active
                      ? "linear-gradient(135deg, #DAA520, #B8860B)"
                      : "linear-gradient(135deg, #444, #222)",
                    border: `2px solid ${active ? "#DAA520" : home ? "#8a6608" : "#555"}`,
                    boxShadow: active
                      ? "0 0 8px rgba(218,165,32,0.6)"
                      : "inset 0 1px 3px rgba(0,0,0,0.8)",
                  }}
                >
                  {active && (
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        background: "#1a1008",
                        borderRadius: "50%",
                      }}
                    />
                  )}
                </div>
                <span
                  className="font-courier text-center"
                  style={{
                    fontSize: 8,
                    color: active ? "#DAA520" : home ? "#B8860B" : "#666",
                    lineHeight: 1.2,
                    letterSpacing: "0.02em",
                  }}
                >
                  {tz}
                </span>
              </button>
            );
          })}
        </div>

        {/* SVG cable */}
        {cableEnd && (
          <svg
            className="absolute pointer-events-none"
            style={{ inset: 0, width: "100%", height: "100%", overflow: "visible" }}
          >
            <path
              d={`M ${plugX} ${plugY} Q ${(plugX + cableEnd.x) / 2} ${plugY + 28} ${cableEnd.x} ${cableEnd.y}`}
              stroke="#cc3300"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }}
            />
          </svg>
        )}
      </div>

      <div
        className="font-courier mt-3 text-center"
        style={{ color: "#8a6a4a", fontSize: 9, letterSpacing: "0.1em" }}
      >
        {line
          ? "Тап по гнезду — отключить"
          : "Тап по гнезду — подключить кабель"}
      </div>
    </div>
  );
}
