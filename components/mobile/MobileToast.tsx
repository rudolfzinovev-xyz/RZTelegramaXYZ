"use client";
import { motion } from "framer-motion";

interface Props {
  text: string;
  kind: "info" | "ok" | "err";
}

export function MobileToast({ text, kind }: Props) {
  const colors = {
    info: { bg: "rgba(20,30,60,0.95)", border: "#4a5a8a", text: "#b8c8f0" },
    ok: { bg: "rgba(10,40,10,0.95)", border: "#228B22", text: "#90EE90" },
    err: { bg: "rgba(60,10,10,0.95)", border: "#CC2200", text: "#FF6644" },
  }[kind];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="fixed left-4 right-4 z-50 font-typewriter text-xs tracking-wider px-4 py-3 rounded no-select"
      style={{
        top: "calc(env(safe-area-inset-top) + 56px)",
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        textAlign: "center",
      }}
    >
      {text}
    </motion.div>
  );
}
