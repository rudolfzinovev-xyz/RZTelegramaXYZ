"use client";
import { useState, useRef } from "react";
import { motion, Transition } from "framer-motion";

function playDialSound(digitIndex: number) {
  try {
    const ctx = new AudioContext();
    const clicks = digitIndex + 1;
    // Ratchet clicks during spin
    for (let i = 0; i < clicks; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(180, ctx.currentTime + i * 0.06);
      gain.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.04);
      osc.start(ctx.currentTime + i * 0.06);
      osc.stop(ctx.currentTime + i * 0.06 + 0.04);
    }
    // Spring return thud
    const t = ctx.currentTime + clicks * 0.06 + 0.1;
    const noise = ctx.createOscillator();
    const ng = ctx.createGain();
    noise.connect(ng); ng.connect(ctx.destination);
    noise.frequency.setValueAtTime(120, t);
    noise.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    ng.gain.setValueAtTime(0.12, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    noise.start(t); noise.stop(t + 0.15);
  } catch { /* audio not available */ }
}

interface RotaryDialProps {
  onDial: (phone: string) => void;
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export function RotaryDial({ onDial }: RotaryDialProps) {
  const [number, setNumber] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [spinAngle, setSpinAngle] = useState(0);
  const [activeDigit, setActiveDigit] = useState<string | null>(null);
  const [spinPhase, setSpinPhase] = useState<"idle" | "spinning" | "returning">("idle");
  const spinDurationRef = useRef(300);

  function pressDigit(d: string) {
    if (spinning) return;
    const digitIndex = DIGITS.indexOf(d);
    const angle = (digitIndex + 1) * 36;
    const spinMs = 280 + digitIndex * 65; // 280ms for "1", 865ms for "0"

    spinDurationRef.current = spinMs;
    setActiveDigit(d);
    setSpinning(true);
    setSpinPhase("spinning");
    setSpinAngle(angle);
    setNumber((prev) => prev + d);
    playDialSound(digitIndex);

    setTimeout(() => {
      setSpinPhase("returning");
      setSpinAngle(0);
      setTimeout(() => {
        setSpinning(false);
        setActiveDigit(null);
        setSpinPhase("idle");
      }, 600);
    }, spinMs + 40);
  }

  const dialTransition: Transition = spinPhase === "spinning"
    ? { duration: spinDurationRef.current / 1000, ease: [0.1, 0, 0.35, 1] }
    : spinPhase === "returning"
    ? { type: "spring", stiffness: 550, damping: 32, mass: 0.5 }
    : { duration: 0 };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Number display */}
      <div
        className="font-courier text-lg tracking-widest px-4 py-2 text-center w-full"
        style={{
          background: "#0d0805",
          border: "1px solid #3a2a18",
          color: "#DAA520",
          minHeight: 42,
          borderRadius: "4px",
          minWidth: 220,
        }}
      >
        {number || <span style={{ color: "#3a2a18" }}>Номер...</span>}
      </div>

      {/* Rotary wheel */}
      <div className="relative" style={{ width: 220, height: 220 }}>
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(135deg, #2a1f0e 0%, #1a1008 40%, #0f0805 100%)",
            border: "4px solid #0d0805",
            boxShadow: "0 4px 16px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.04)",
          }}
        />

        {/* Rotating disc */}
        <motion.div
          animate={{ rotate: spinAngle }}
          transition={dialTransition}
          className="absolute inset-2 rounded-full"
          style={{
            background: "linear-gradient(135deg, #3a2a1a 0%, #1a1008 50%, #2a1a08 100%)",
            border: "2px solid #0d0805",
          }}
        >
          {DIGITS.map((d, i) => {
            const angle = i * 36 - 90;
            const rad = angle * (Math.PI / 180);
            const r = 75;
            const x = 108 + r * Math.cos(rad);
            const y = 108 + r * Math.sin(rad);

            return (
              <button
                key={d}
                onClick={() => pressDigit(d)}
                disabled={spinning}
                className="absolute flex items-center justify-center rounded-full transition-all"
                style={{
                  width: 28,
                  height: 28,
                  left: x - 28,
                  top: y - 28,
                  background: activeDigit === d ? "#DAA520" : "#0a0805",
                  border: `2px solid ${activeDigit === d ? "#DAA520" : "#1a1008"}`,
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.8)",
                  cursor: spinning ? "not-allowed" : "pointer",
                  color: activeDigit === d ? "#1a1008" : "#6b5030",
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 11,
                  fontWeight: "bold",
                }}
              >
                {d}
              </button>
            );
          })}

          {/* Center */}
          <div
            className="absolute rounded-full"
            style={{
              width: 36,
              height: 36,
              background: "linear-gradient(135deg, #5a3a1a, #2a1008)",
              border: "3px solid #0d0805",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        </motion.div>

        {/* Stop finger guard */}
        <div
          className="absolute"
          style={{
            width: 16,
            height: 36,
            background: "#1a1008",
            borderRadius: "3px",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            border: "2px solid #0d0805",
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex gap-3 w-full">
        <button
          onClick={() => setNumber((p) => p.slice(0, -1))}
          className="flex-1 py-2 font-typewriter text-xs tracking-wider uppercase"
          style={{ background: "#2a1a10", color: "#cc8844", border: "1px solid #3a2a18", borderRadius: "4px", cursor: "pointer" }}
        >
          ← Стереть
        </button>
        <button
          onClick={() => onDial(number)}
          disabled={!number || spinning}
          className="flex-1 py-2 font-typewriter text-xs tracking-wider uppercase"
          style={{
            background: number && !spinning ? "linear-gradient(135deg, #1a5a1a, #0a3a0a)" : "#1a1a1a",
            color: number && !spinning ? "#90EE90" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: number && !spinning ? "pointer" : "not-allowed",
          }}
        >
          Позвонить
        </button>
      </div>
    </div>
  );
}
