"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDroppable } from "@dnd-kit/core";
import { formatInTZ } from "@/lib/tz";

interface MessageData {
  id: string;
  content: string;
  senderName: string;
  senderPhone: string;
  senderTimezone?: string;
  createdAt: string;
  folderId?: string | null;
}

interface WastebasketProps {
  messages: MessageData[];
  onRescue: (msg: MessageData) => void;
  timezone: string;
}

export function MissedInbox({ messages, onRescue, timezone }: WastebasketProps) {
  const [open, setOpen] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: "missed-inbox" });

  const hasMessages = messages.length > 0;

  return (
    <>
      <motion.div
        ref={setNodeRef}
        className="relative cursor-pointer select-none flex flex-col items-center"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        title="Входящие (не получены)"
        style={{ width: 120 }}
      >
        <svg width="120" height="150" viewBox="0 0 70 88" style={{ overflow: "visible" }}>
          {/* Crumpled papers sticking out when not empty */}
          {hasMessages && (
            <>
              <ellipse cx="25" cy="22" rx="12" ry="5" fill="#f0eacc" stroke="#c8b080" strokeWidth="0.8"
                transform="rotate(-12, 25, 22)" opacity="0.9" />
              <ellipse cx="45" cy="20" rx="10" ry="4.5" fill="#ede4c0" stroke="#c8b080" strokeWidth="0.8"
                transform="rotate(8, 45, 20)" opacity="0.9" />
              {messages.length > 2 && (
                <ellipse cx="35" cy="19" rx="9" ry="4" fill="#e8ddb8" stroke="#c8b080" strokeWidth="0.8"
                  transform="rotate(-3, 35, 19)" opacity="0.85" />
              )}
            </>
          )}

          {/* Basket body fill */}
          <path
            d="M8,28 L62,28 L56,82 L14,82 Z"
            fill={isOver ? "rgba(218,165,32,0.15)" : "rgba(90,58,20,0.12)"}
            stroke="none"
          />

          {/* Vertical wire lines */}
          {[0,1,2,3,4,5,6].map(i => (
            <line
              key={i}
              x1={8 + i * 9}
              y1="28"
              x2={14 + i * 7}
              y2="82"
              stroke={isOver ? "#DAA520" : "#5a3a14"}
              strokeWidth="1.2"
              opacity="0.75"
            />
          ))}

          {/* Horizontal wire rings */}
          <path d="M9,46 Q35,52 61,46" fill="none" stroke={isOver ? "#DAA520" : "#5a3a14"} strokeWidth="1.5"/>
          <path d="M11,64 Q35,70 59,64" fill="none" stroke={isOver ? "#DAA520" : "#5a3a14"} strokeWidth="1.5"/>

          {/* Top rim */}
          <ellipse
            cx="35" cy="28" rx="27" ry="6"
            fill={isOver ? "rgba(218,165,32,0.2)" : "rgba(90,58,20,0.1)"}
            stroke={isOver ? "#DAA520" : "#5a3a14"}
            strokeWidth="2"
          />

          {/* Bottom ellipse */}
          <ellipse cx="35" cy="80" rx="21" ry="5"
            fill="rgba(90,58,20,0.1)" stroke={isOver ? "#DAA520" : "#5a3a14"} strokeWidth="1.5"/>

          {/* Handle arch */}
          <path
            d="M22,28 Q35,14 48,28"
            fill="none"
            stroke={isOver ? "#DAA520" : "#5a3a14"}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Glow when hovering drop */}
          {isOver && (
            <ellipse cx="35" cy="28" rx="27" ry="6"
              fill="none" stroke="#DAA520" strokeWidth="3" opacity="0.5"
              style={{ filter: "blur(2px)" }}
            />
          )}
        </svg>

        {/* Count badge */}
        {hasMessages && (
          <div
            className="absolute font-typewriter text-[10px]"
            style={{
              top: 28,
              right: 4,
              background: "#8B1A1A",
              color: "#f5e8c8",
              borderRadius: "50%",
              width: 22,
              height: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #5a1010",
              boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
              fontWeight: "bold",
            }}
          >
            {messages.length > 9 ? "9+" : messages.length}
          </div>
        )}

        <div className="font-typewriter text-[11px] tracking-widest mt-1" style={{ color: "#8a6a4a" }}>
          ВХОДЯЩИЕ
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.88, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: 440,
                maxHeight: "70vh",
                background: "linear-gradient(135deg, #1a1008, #2a1a10)",
                borderRadius: "6px",
                boxShadow: "8px 12px 40px rgba(0,0,0,0.7)",
                border: "2px solid #3a2a18",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-3 flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #2a1a10, #1a1008)", borderBottom: "2px solid #3a2a18" }}
              >
                <span className="font-typewriter tracking-widest uppercase text-sm" style={{ color: "#8a6a4a" }}>
                  📬 Неполученные · {messages.length}
                </span>
                <button onClick={() => setOpen(false)} className="font-typewriter text-[#5a3a1a] hover:text-[#8a6a4a] text-lg">
                  ✕
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 ? (
                  <p className="text-center font-typewriter text-xs py-8" style={{ color: "#3a2a18" }}>
                    Корзина пуста
                  </p>
                ) : (
                  messages.map(msg => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 rounded"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid #2a1a10",
                        filter: "sepia(40%) brightness(0.85)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-typewriter text-[9px] mb-1" style={{ color: "#6a5030" }}>
                            ОТ: {msg.senderName} · {formatInTZ(msg.createdAt, timezone)}
                          </div>
                          <div
                            className="font-courier text-xs"
                            style={{ color: "#8a7050", wordBreak: "break-word", overflowWrap: "break-word" }}
                          >
                            {msg.content}
                          </div>
                        </div>
                        <button
                          onClick={() => { onRescue(msg); }}
                          className="flex-shrink-0 px-2 py-1 font-typewriter text-[9px] tracking-wider uppercase"
                          style={{
                            background: "linear-gradient(135deg, #1a3a1a, #0a2a0a)",
                            color: "#6aaa6a",
                            border: "1px solid #2a4a2a",
                            borderRadius: "3px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ↑ Стол
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
