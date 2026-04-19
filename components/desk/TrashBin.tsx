"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDroppable } from "@dnd-kit/core";

interface TrashBinProps {
  count: number; // just for display — trash empties on next session
}

export function TrashBin({ count }: TrashBinProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: "trashbin" });

  // Show "crunch" visual briefly when something drops
  function triggerCrunch() {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 600);
  }

  return (
    <motion.div
      ref={setNodeRef}
      className="relative select-none flex flex-col items-center"
      style={{ width: 100 }}
      animate={isOver ? { scale: 1.1 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      title="Мусорка — перетащи сюда для удаления"
    >
      <svg width="100" height="130" viewBox="0 0 56 72" style={{ overflow: "visible" }}>
        {/* Crumple flash */}
        {showConfetti && (
          <circle cx="28" cy="36" r="28" fill="rgba(180,60,20,0.25)" opacity="0.8" />
        )}

        {/* Lid */}
        <rect
          x="8" y={isOver ? 2 : 6}
          width="40" height="7"
          rx="3"
          fill={isOver ? "#cc3300" : "#5a3a1a"}
          stroke={isOver ? "#ff6644" : "#3a2010"}
          strokeWidth="1.5"
          style={{ transition: "y 0.15s" }}
        />
        {/* Lid handle */}
        <rect
          x="22" y={isOver ? 0 : 4}
          width="12" height="5"
          rx="2"
          fill={isOver ? "#ff4422" : "#4a2a10"}
          stroke={isOver ? "#ff6644" : "#2a1808"}
          strokeWidth="1.2"
          style={{ transition: "y 0.15s" }}
        />

        {/* Body */}
        <path
          d="M10,14 L46,14 L42,66 L14,66 Z"
          fill={isOver ? "rgba(200,40,0,0.18)" : "rgba(60,30,10,0.15)"}
          stroke={isOver ? "#cc3300" : "#4a2a10"}
          strokeWidth="2"
        />

        {/* Vertical lines on body */}
        {[0, 1, 2].map(i => (
          <line
            key={i}
            x1={18 + i * 10}
            y1="14"
            x2={17 + i * 9}
            y2="66"
            stroke={isOver ? "#cc3300" : "#3a2010"}
            strokeWidth="1"
            opacity="0.6"
          />
        ))}

        {/* Bottom */}
        <ellipse
          cx="28" cy="64"
          rx="14" ry="4"
          fill="rgba(60,30,10,0.2)"
          stroke={isOver ? "#cc3300" : "#3a2010"}
          strokeWidth="1.5"
        />

        {/* Glow on hover */}
        {isOver && (
          <path
            d="M10,14 L46,14 L42,66 L14,66 Z"
            fill="none"
            stroke="#ff4422"
            strokeWidth="3"
            opacity="0.4"
            style={{ filter: "blur(3px)" }}
          />
        )}
      </svg>

      <div className="font-typewriter text-[11px] tracking-widest mt-0.5" style={{ color: isOver ? "#cc3300" : "#6a4a3a" }}>
        {isOver ? "УДАЛИТЬ" : "МУСОР"}
      </div>
    </motion.div>
  );
}
