"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotaryDial } from "./RotaryDial";

interface PhoneModalProps {
  open: boolean;
  onClose: () => void;
  onDial: (phone: string) => void;
  line: number;
}

const LINE_KEY = "rz:phone_line";
const LINES = ["1", "2", "3", "4", "5", "6"];

function getStoredLine(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LINE_KEY);
}
function setStoredLine(line: string | null) {
  if (typeof window === "undefined") return;
  if (line) localStorage.setItem(LINE_KEY, line);
  else localStorage.removeItem(LINE_KEY);
  window.dispatchEvent(new CustomEvent("rz:line_changed", { detail: line }));
}

export function PhoneModal({ open, onClose, onDial, line: myLine }: PhoneModalProps) {
  const myLineStr = String(myLine);
  const [selectedLine, setSelectedLine] = useState<string | null>(() => getStoredLine());
  const [draggingCable, setDraggingCable] = useState(false);
  const [cableStart, setCableStart] = useState({ x: 0, y: 0 });
  const [cableEnd, setCableEnd] = useState({ x: 0, y: 0 });
  const [connectedCable, setConnectedCable] = useState<{ start: {x:number;y:number}; end: {x:number;y:number} } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  function handleCableStart(e: React.MouseEvent) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const boardRect = boardRef.current!.getBoundingClientRect();
    const sx = rect.left - boardRect.left + rect.width / 2;
    const sy = rect.top - boardRect.top + rect.height / 2;
    setDraggingCable(true);
    setSelectedLine(null);
    setStoredLine(null);
    setConnectedCable(null);
    setCableStart({ x: sx, y: sy });
    setCableEnd({ x: sx, y: sy });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!draggingCable) return;
    const boardRect = boardRef.current!.getBoundingClientRect();
    setCableEnd({ x: e.clientX - boardRect.left, y: e.clientY - boardRect.top });
  }

  function handleMouseUp() {
    if (draggingCable) setDraggingCable(false);
  }

  function handleSlotDrop(e: React.MouseEvent, line: string) {
    if (!draggingCable) return;
    const boardRect = boardRef.current!.getBoundingClientRect();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ex = rect.left - boardRect.left + rect.width / 2;
    const ey = rect.top - boardRect.top + rect.height / 2;
    setDraggingCable(false);
    setSelectedLine(line);
    setStoredLine(line);
    setConnectedCable({ start: cableStart, end: { x: ex, y: ey } });
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
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 420,
              background: "linear-gradient(135deg, #1a1008 0%, #0d0805 100%)",
              borderRadius: "12px",
              border: "3px solid #2a1f0e",
              boxShadow: "8px 16px 48px rgba(0,0,0,0.9)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ background: "linear-gradient(180deg, #2a1f0e, #1a1008)", borderBottom: "2px solid #3a2a18", borderRadius: "9px 9px 0 0" }}
            >
              <div>
                <div className="font-typewriter text-[#DAA520] tracking-widest uppercase text-sm">ТЕЛЕФОН RZ-TEL</div>
                <div className="font-typewriter text-[10px] tracking-widest mt-0.5" style={{ color: "#8a6a4a" }}>
                  Ваша линия: Л{myLineStr}
                </div>
              </div>
              <button onClick={onClose} className="font-typewriter text-[#8a6a4a] hover:text-[#DAA520] text-lg">✕</button>
            </div>

            <div className="p-4">
              {/* Switchboard panel — boardRef here, same as Switchboard pattern */}
              <div
                ref={boardRef}
                className="relative select-none rounded-lg"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{
                  background: "linear-gradient(180deg, #2a2a2a, #1a1a1a)",
                  border: "2px solid #3a3a3a",
                  padding: "12px",
                  cursor: draggingCable ? "grabbing" : "default",
                  marginBottom: "16px",
                }}
              >
                <div className="font-typewriter text-xs tracking-widest uppercase text-center mb-1" style={{ color: "#DAA520" }}>
                  ВЫБЕРИТЕ ЛИНИЮ СОБЕСЕДНИКА
                </div>
                <div className="font-typewriter text-[9px] text-center mb-3" style={{ color: "#8a6a4a" }}>
                  <span style={{ color: "#DAA520" }}>●</span> — ваша линия (Л{myLineStr})
                </div>

                {/* Line jacks — 6 lines in a single row */}
                <div className="grid mb-4" style={{ gridTemplateColumns: "repeat(6, 1fr)", gap: "10px" }}>
                  {LINES.map((ln) => {
                    const active = selectedLine === ln;
                    const isHome = ln === myLineStr;
                    return (
                      <div
                        key={ln}
                        className="flex flex-col items-center gap-1"
                        onMouseUp={(e) => handleSlotDrop(e, ln)}
                      >
                        {/* Indicator lamp */}
                        <motion.div
                          animate={active ? { opacity: [0.7, 1, 0.7] } : { opacity: 1 }}
                          transition={active ? { duration: 1.2, repeat: Infinity } : {}}
                          style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: active ? "#228B22" : isHome ? "#DAA520" : "#1a1a1a",
                            border: `1px solid ${active ? "#22BB22" : isHome ? "#B8860B" : "#444"}`,
                            boxShadow: active ? "0 0 4px #22BB22" : isHome ? "0 0 3px #DAA520" : "none",
                          }}
                        />
                        {/* Jack socket */}
                        <div
                          style={{
                            width: 30, height: 30, borderRadius: "50%",
                            background: active
                              ? "linear-gradient(135deg, #1a5a1a, #0a3a0a)"
                              : isHome
                              ? "linear-gradient(135deg, #3a2a00, #1a1400)"
                              : "linear-gradient(135deg, #333, #1a1a1a)",
                            border: `2px solid ${active ? "#228B22" : isHome ? "#B8860B" : "#555"}`,
                            boxShadow: active ? "0 0 6px rgba(34,139,34,0.5)" : isHome ? "0 0 4px rgba(184,134,11,0.4)" : "inset 0 1px 3px rgba(0,0,0,0.8)",
                            cursor: draggingCable ? "crosshair" : "default",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          {active && <div style={{ width: 8, height: 8, background: "#1a1008", borderRadius: "50%" }} />}
                        </div>
                        <span
                          className="font-typewriter tracking-widest"
                          style={{ fontSize: 9, color: active ? "#228B22" : isHome ? "#DAA520" : "#888", whiteSpace: "nowrap" }}
                        >
                          Л{ln}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Cable source plug */}
                <div className="flex items-center gap-3">
                  <motion.div
                    className="rounded-full cursor-grab active:cursor-grabbing flex-shrink-0"
                    onMouseDown={handleCableStart}
                    whileHover={{ scale: 1.1 }}
                    style={{
                      width: 28, height: 28,
                      background: "linear-gradient(135deg, #cc3300, #881100)",
                      border: "3px solid #441100",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
                    }}
                  />
                  <span className="font-typewriter text-[10px]" style={{ color: "#666" }}>
                    {selectedLine ? `Подключено: ЛИНИЯ ${selectedLine}` : "Перетащите кабель на линию"}
                  </span>
                </div>

                {/* SVG cable — shown while dragging and after connected */}
                {(draggingCable || connectedCable) && (
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    style={{ width: "100%", height: "100%", overflow: "visible", zIndex: 10 }}
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

              {/* Rotary dial — locked until line selected */}
              {selectedLine ? (
                <RotaryDial onDial={(phone) => { onDial(phone); onClose(); }} />
              ) : (
                <div
                  className="flex flex-col items-center justify-center rounded-lg"
                  style={{ height: 180, background: "rgba(0,0,0,0.3)", border: "2px dashed #3a2a18" }}
                >
                  <div className="font-typewriter text-xs tracking-widest uppercase text-center" style={{ color: "#5a3a18" }}>
                    Подключите линию<br />для набора
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
