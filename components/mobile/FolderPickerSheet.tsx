"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { MobileFolder } from "@/app/desk/MobileDeskClient";

interface Props {
  folders: MobileFolder[];
  onPick: (folderId: string) => void;
  onClose: () => void;
  onCreateFolder?: (label: string) => Promise<void> | void;
}

export function FolderPickerSheet({ folders, onPick, onClose, onCreateFolder }: Props) {
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !onCreateFolder) return;
    await onCreateFolder(label.trim());
    setLabel("");
    setCreating(false);
  }

  return (
    <motion.div
      key="backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-0 right-0 bottom-0 pb-safe"
        style={{
          background: "linear-gradient(180deg, #2a1a10, #1a1008)",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          border: "1px solid rgba(218,165,32,0.3)",
          borderBottom: "none",
          maxHeight: "70vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            width: 40, height: 4, borderRadius: 2,
            background: "#5a4020",
            margin: "10px auto 12px",
          }}
        />
        <div
          className="px-5 pb-2 font-typewriter text-sm tracking-widest uppercase flex-shrink-0"
          style={{ color: "#DAA520" }}
        >
          Выберите папку
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {folders.length === 0 && !creating && (
            <p className="text-center font-typewriter text-xs py-6" style={{ color: "#5a4020" }}>
              Папок пока нет — создайте первую
            </p>
          )}
          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => onPick(folder.id)}
              className="w-full text-left no-select tap-target"
              style={{
                background: "rgba(200,180,144,0.08)",
                border: "1px solid rgba(200,180,144,0.25)",
                borderRadius: 6,
                padding: "12px 14px",
                cursor: "pointer",
              }}
            >
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 20 }}>📁</span>
                <div className="flex-1 min-w-0">
                  <div className="font-typewriter text-sm truncate" style={{ color: "#f0dcb0" }}>
                    {folder.label}
                  </div>
                  <div className="font-courier text-[10px]" style={{ color: "#8a7050" }}>
                    {folder.messages.length} л.
                  </div>
                </div>
              </div>
            </button>
          ))}

          {onCreateFolder && (
            creating ? (
              <form onSubmit={handleCreate} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="Название папки..."
                  autoFocus
                  maxLength={80}
                  className="flex-1 font-courier px-3 py-2 rounded focus:outline-none"
                  style={{
                    background: "#0d0805",
                    border: "1px solid #3a2a18",
                    color: "#f5e8c8",
                    fontSize: 14,
                  }}
                />
                <button
                  type="submit"
                  className="font-typewriter text-xs px-3 py-2 tap-target no-select"
                  style={{
                    background: "linear-gradient(135deg, #B8860B, #DAA520)",
                    color: "#1a1008",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  ОК
                </button>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setLabel(""); }}
                  className="font-typewriter text-xs px-3 py-2 tap-target no-select"
                  style={{
                    background: "transparent",
                    color: "#8a6a4a",
                    border: "1px solid #3a2a18",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full font-typewriter text-xs tap-target no-select"
                style={{
                  background: "transparent",
                  color: "#DAA520",
                  border: "1px dashed rgba(218,165,32,0.4)",
                  borderRadius: 6,
                  padding: "12px",
                  cursor: "pointer",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                + Новая папка
              </button>
            )
          )}
        </div>
        <button
          onClick={onClose}
          className="w-[calc(100%-32px)] mx-4 my-3 font-typewriter text-xs tap-target no-select"
          style={{
            background: "transparent",
            color: "#8a6a4a",
            border: "1px solid #3a2a18",
            borderRadius: 6,
            padding: "12px",
            cursor: "pointer",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Отмена
        </button>
      </motion.div>
    </motion.div>
  );
}
