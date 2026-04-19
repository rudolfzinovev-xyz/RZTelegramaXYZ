"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { formatDateInTZ } from "@/lib/tz";

interface MessageSlipProps {
  id: string;
  content: string;
  senderName: string;
  senderPhone: string;
  createdAt: string;
  timezone: string;
  style?: React.CSSProperties;
}

export function MessageSlip({ id, content, senderName, senderPhone, createdAt, timezone, style }: MessageSlipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const [rotation] = useState(() => (Math.random() - 0.5) * 6);

  return (
    <motion.div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      initial={{ opacity: 0, y: 20, rotate: rotation }}
      animate={{
        opacity: isDragging ? 0.8 : 1,
        y: 0,
        scale: isDragging ? 1.05 : 1,
        rotate: isDragging ? 0 : rotation,
      }}
      style={{
        transform: transform
          ? `translate(${transform.x}px, ${transform.y}px)`
          : undefined,
        cursor: isDragging ? "grabbing" : "grab",
        zIndex: isDragging ? 999 : 1,
        ...style,
      }}
      className="paper-surface paper-shadow rounded select-none"
    >
      <div
        className="p-3"
        style={{
          width: 160,
          border: "1px solid #c8b080",
          borderRadius: "3px",
          background: isDragging
            ? "#f0ead0"
            : "linear-gradient(135deg, #f5f0e0 0%, #ede5c8 40%, #e6dab8 100%)",
          boxShadow: "inset 0 0 20px rgba(100,70,20,0.08)",
          filter: "sepia(6%)",
        }}
      >
        <div className="font-typewriter text-[8px] text-[#8a6a4a] mb-1 leading-tight">
          ОТ: {senderName}<br />
          {formatDateInTZ(createdAt, timezone)}
        </div>
        <div
          className="font-courier text-[11px] text-[#1a1008] overflow-hidden"
          style={{ maxHeight: 60, WebkitLineClamp: 3, display: "-webkit-box", WebkitBoxOrient: "vertical", wordBreak: "break-word", overflowWrap: "break-word" }}
        >
          {content}
        </div>

        {/* Drag hint */}
        <div className="mt-2 text-center font-typewriter text-[8px] text-[#c8a878]">
          ↕ в папку
        </div>
      </div>
    </motion.div>
  );
}
