"use client";
import { useEffect } from "react";
import { motion, useDragControls, useMotionValue } from "framer-motion";

interface Props {
  id: string;
  defaultX: number;
  defaultY: number;
  zIndex?: number;
  children: React.ReactNode;
}

const STORAGE_PREFIX = "rz:slot:";

// Wraps a desk object so the user can drag-reposition it via the small
// handle in the corner. Body clicks are NOT consumed by drag — only
// pointer-down on the handle starts a drag (dragListener=false).
// Position persists per-slot in localStorage, so the layout sticks
// across reloads on this device.
export function DraggableSlot({ id, defaultX, defaultY, zIndex, children }: Props) {
  const controls = useDragControls();
  const x = useMotionValue(defaultX);
  const y = useMotionValue(defaultY);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + id);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          x.set(parsed.x);
          y.set(parsed.y);
        }
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleDragEnd() {
    try {
      localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify({ x: x.get(), y: y.get() }));
    } catch { /* ignore */ }
  }

  return (
    <motion.div
      drag
      dragControls={controls}
      dragListener={false}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      style={{ position: "absolute", top: 0, left: 0, x, y, zIndex }}
    >
      <div
        onPointerDown={(e) => { e.preventDefault(); controls.start(e); }}
        title="Зажмите и тащите, чтобы переставить"
        style={{
          position: "absolute",
          top: -10,
          left: -10,
          width: 22,
          height: 22,
          background: "rgba(218,165,32,0.95)",
          border: "1px solid #5a4008",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#1a1008",
          fontSize: 11,
          fontFamily: "'Courier Prime', monospace",
          cursor: "grab",
          zIndex: 200,
          touchAction: "none",
          userSelect: "none",
          boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
        }}
      >
        ⤧
      </div>
      {children}
    </motion.div>
  );
}
