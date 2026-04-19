"use client";
import { useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface TypewriterProps {
  value: string;
  onChange: (v: string) => void;
}

export function Typewriter({ value, onChange }: TypewriterProps) {
  const audioRef = useRef<AudioContext | null>(null);

  function playKeyClick() {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800 + Math.random() * 200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // audio not available
    }
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Block backspace, delete, ctrl+z, ctrl+a (select all for deletion)
      if (
        e.key === "Backspace" ||
        e.key === "Delete" ||
        (e.ctrlKey && e.key === "z") ||
        (e.metaKey && e.key === "z")
      ) {
        e.preventDefault();
        return;
      }
      if (e.key.length === 1) {
        playKeyClick();
      }
    },
    []
  );

  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #3a3020 0%, #2a2018 100%)",
        border: "3px solid #1a1008",
        boxShadow: "inset 0 4px 12px rgba(0,0,0,0.6)",
      }}
    >
      {/* Typewriter header */}
      <div
        className="flex items-center gap-2 px-4 py-2"
        style={{ background: "linear-gradient(180deg, #4a3828, #2a2018)", borderBottom: "2px solid #1a1008" }}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#cc3300" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#DAA520" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#228B22" }} />
        <span className="font-typewriter text-xs tracking-widest uppercase ml-2" style={{ color: "#8a7050" }}>
          ПЕЧАТНАЯ МАШИНКА — ИСПРАВЛЕНИЯ НЕВОЗМОЖНЫ
        </span>
      </div>

      {/* Paper roll */}
      <div
        className="relative m-4"
        style={{
          background: "var(--paper-aged)",
          minHeight: 160,
          borderRadius: "2px",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        {/* Paper lines */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0"
            style={{
              top: 28 + i * 22,
              height: 1,
              background: "rgba(100,150,200,0.15)",
            }}
          />
        ))}

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Начните печатать сообщение..."
          className="relative w-full bg-transparent font-typewriter text-[#1a1008] resize-none focus:outline-none p-4"
          style={{
            minHeight: 160,
            fontSize: 15,
            lineHeight: "22px",
            letterSpacing: "0.05em",
            zIndex: 1,
          }}
          spellCheck={false}
        />
      </div>

      {/* Clear sheet button */}
      <div className="flex items-center justify-between px-4 pb-3">
        <span className="font-typewriter text-xs" style={{ color: "#5a4020" }}>
          {value.length} симв.
        </span>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange("")}
          className="font-typewriter text-xs tracking-wider uppercase px-3 py-1"
          style={{
            background: "linear-gradient(135deg, #3a1a10, #2a1008)",
            color: "#cc8844",
            border: "1px solid #5a2a18",
            borderRadius: "3px",
            cursor: "pointer",
          }}
        >
          Чистый лист
        </motion.button>
      </div>
    </div>
  );
}
