"use client";
import { useState, useRef } from "react";
import { motion } from "framer-motion";

interface SwitchboardProps {
  onConnect: (phone: string) => void;
  prefilledPhone?: string;
}

const LINE_SLOTS = ["1", "2", "3", "4", "5", "6"];

export function Switchboard({ onConnect, prefilledPhone }: SwitchboardProps) {
  const [connectedSlot, setConnectedSlot] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("switchboard_slot") ?? null;
  });
  const [phone, setPhone] = useState(prefilledPhone || "");
  const [draggingCable, setDraggingCable] = useState(false);
  const [cableEnd, setCableEnd] = useState({ x: 0, y: 0 });
  const [cableStart, setCableStart] = useState({ x: 0, y: 0 });
  const [connectedCable, setConnectedCable] = useState<{ start: {x:number;y:number}; end: {x:number;y:number} } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  function handleCableStart(e: React.MouseEvent) {
    e.preventDefault();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const boardRect = boardRef.current!.getBoundingClientRect();
    const sx = rect.left - boardRect.left + rect.width / 2;
    const sy = rect.top - boardRect.top + rect.height / 2;
    setDraggingCable(true);
    setConnectedSlot(null);
    setConnectedCable(null);
    setCableStart({ x: sx, y: sy });
    setCableEnd({ x: sx, y: sy });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!draggingCable) return;
    const boardRect = boardRef.current!.getBoundingClientRect();
    setCableEnd({ x: e.clientX - boardRect.left, y: e.clientY - boardRect.top });
  }

  function handleSlotDrop(e: React.MouseEvent, line: string) {
    if (!draggingCable) return;
    const boardRect = boardRef.current!.getBoundingClientRect();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ex = rect.left - boardRect.left + rect.width / 2;
    const ey = rect.top - boardRect.top + rect.height / 2;
    setDraggingCable(false);
    setConnectedSlot(line);
    setConnectedCable({ start: cableStart, end: { x: ex, y: ey } });
    localStorage.setItem("switchboard_slot", line);
  }

  function handleMouseUp() {
    if (draggingCable && !connectedSlot) {
      setDraggingCable(false);
    }
  }

  return (
    <div
      ref={boardRef}
      className="relative select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: draggingCable ? "grabbing" : "default" }}
    >
      {/* Switchboard panel */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          width: "100%",
          background: "linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)",
          border: "2px solid #3a3a3a",
          padding: "16px",
        }}
      >
        <div className="font-typewriter text-xs tracking-widest uppercase text-center mb-3" style={{ color: "#DAA520" }}>
          КОММУТАТОР — ЛИНИИ СВЯЗИ
        </div>

        {/* Line slots grid — 6 lines */}
        <div className="grid grid-cols-6 gap-3 mb-4">
          {LINE_SLOTS.map((line) => (
            <div
              key={line}
              className="relative flex flex-col items-center gap-1"
              onMouseUp={(e) => handleSlotDrop(e, line)}
            >
              {/* Socket */}
              <div
                className="rounded-full flex items-center justify-center transition-all"
                style={{
                  width: 28,
                  height: 28,
                  background: connectedSlot === line
                    ? "linear-gradient(135deg, #DAA520, #B8860B)"
                    : "linear-gradient(135deg, #444, #222)",
                  border: `2px solid ${connectedSlot === line ? "#DAA520" : "#555"}`,
                  boxShadow: connectedSlot === line ? "0 0 8px #DAA520" : "inset 0 1px 3px rgba(0,0,0,0.8)",
                  cursor: draggingCable ? "crosshair" : "default",
                }}
              >
                {connectedSlot === line && (
                  <div style={{ width: 8, height: 8, background: "#1a1008", borderRadius: "50%" }} />
                )}
              </div>
              <span className="font-typewriter text-center tracking-widest" style={{ fontSize: 9, color: connectedSlot === line ? "#DAA520" : "#888", lineHeight: 1.2 }}>
                Л{line}
              </span>
            </div>
          ))}
        </div>

        {/* Cable source plug */}
        <div className="flex items-center gap-3">
          <motion.div
            className="rounded-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleCableStart}
            whileHover={{ scale: 1.1 }}
            style={{
              width: 32,
              height: 32,
              background: "linear-gradient(135deg, #cc3300, #881100)",
              border: "3px solid #441100",
              boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
              flexShrink: 0,
            }}
          />
          <span className="font-typewriter text-xs" style={{ color: "#666" }}>
            {connectedSlot
              ? `Подключено: ЛИНИЯ ${connectedSlot}`
              : "Перетащите кабель в гнездо линии"}
          </span>
        </div>

        {/* SVG cable — shown while dragging and after connected */}
        {(draggingCable || connectedCable) && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: "100%", height: "100%", overflow: "visible" }}
          >
            {(() => {
              const s = draggingCable ? cableStart : connectedCable!.start;
              const e = draggingCable ? cableEnd : connectedCable!.end;
              return (
                <path
                  d={`M ${s.x} ${s.y} Q ${(s.x + e.x) / 2} ${s.y + 30} ${e.x} ${e.y}`}
                  stroke="#cc3300"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
              );
            })()}
          </svg>
        )}
      </div>

      {/* Phone number input (shown when connected) */}
      {connectedSlot && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3"
        >
          <label className="block font-typewriter text-xs tracking-wider uppercase mb-1" style={{ color: "#888" }}>
            Номер абонента
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 123-45-67"
              className="flex-1 bg-[#0d0805] border border-[#3a2a18] text-[var(--paper-aged)] font-courier px-3 py-2 rounded text-sm focus:outline-none focus:border-[#DAA520]"
            />
            <button
              onClick={() => phone.trim() && onConnect(phone.trim())}
              className="px-4 py-2 font-typewriter text-xs tracking-wider uppercase"
              style={{
                background: "linear-gradient(135deg, #B8860B, #DAA520)",
                color: "#1a1008",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Набрать
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
