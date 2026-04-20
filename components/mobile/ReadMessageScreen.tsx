"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatInTZ } from "@/lib/tz";
import type { MobileMessage, MobileFolder } from "@/app/desk/MobileDeskClient";
import { FolderPickerSheet } from "./FolderPickerSheet";

interface Props {
  message: MobileMessage;
  timezone: string;
  folders: MobileFolder[];
  fromFolderId: string | null;
  onClose: () => void;
  onFileToFolder: (folderId: string) => void | Promise<void>;
  onPullFromFolder: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onReply: () => void;
  onCreateFolder?: (label: string) => Promise<void> | void;
}

let printAudioCtx: AudioContext | null = null;
function playPrintClick() {
  try {
    if (!printAudioCtx) printAudioCtx = new AudioContext();
    const ctx = printAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(700 + Math.random() * 250, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.04);
  } catch { /* audio not available */ }
}

function addLineNumbers(text: string): string {
  return text.split("\n").map((line, i) => `${String(i + 1).padStart(3, "0")} ${line}`).join("\n");
}

export function ReadMessageScreen({
  message, timezone, folders, fromFolderId,
  onClose, onFileToFolder, onPullFromFolder, onDelete, onReply, onCreateFolder,
}: Props) {
  const [displayed, setDisplayed] = useState("");
  const [printing, setPrinting] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSystem = message.senderName === "СИСТЕМА";
  const isInFolder = fromFolderId !== null;

  // Teletype animation on mount. Shorter messages → slower per-char for feel.
  // Messages longer than ~400 chars skip animation to avoid making the user wait.
  useEffect(() => {
    if (message.content.length > 400) {
      setDisplayed(message.content);
      setPrinting(false);
      return;
    }
    let index = 0;
    setDisplayed("");
    setPrinting(true);
    const step = () => {
      if (index >= message.content.length) {
        setPrinting(false);
        return;
      }
      index++;
      setDisplayed(message.content.slice(0, index));
      playPrintClick();
      const ch = message.content[index - 1];
      const delay = ch === " " || ch === "\n" ? 80 : 28;
      timeoutRef.current = setTimeout(step, delay);
    };
    timeoutRef.current = setTimeout(step, 120);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [message.id]);

  function skipPrinting() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDisplayed(message.content);
    setPrinting(false);
  }

  const header =
    `ОТ: ${message.senderName}\n` +
    (message.senderPhone ? `${message.senderPhone}${message.senderTimezone ? ` [${message.senderTimezone}]` : ""}\n` : "") +
    `ДАТА: ${formatInTZ(message.createdAt, timezone)}`;

  const numbered = addLineNumbers(displayed);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: "#0d0805",
      }}
    >
      {/* Header */}
      <header
        className="pt-safe flex-shrink-0"
        style={{
          background: "linear-gradient(180deg, #2a1a10, #1a1008)",
          borderBottom: "1px solid rgba(218,165,32,0.25)",
        }}
      >
        <div className="flex items-center gap-3 px-4" style={{ height: 52 }}>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="tap-target no-select"
            style={{
              width: 40, height: 40,
              background: "rgba(218,165,32,0.08)",
              border: "1px solid rgba(218,165,32,0.25)",
              borderRadius: 6,
              color: "#DAA520",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <div
              className="font-typewriter text-xs tracking-[0.25em] uppercase truncate"
              style={{ color: "#DAA520" }}
            >
              {isSystem ? "Системное" : "Входящее"}
            </div>
            <div className="font-courier text-[11px] truncate" style={{ color: "#8a7050" }}>
              {message.senderName}{message.senderPhone ? ` · ${message.senderPhone}` : ""}
            </div>
          </div>
          {printing && (
            <button
              onClick={skipPrinting}
              className="font-typewriter text-[10px] tap-target no-select px-3"
              style={{
                background: "rgba(218,165,32,0.12)",
                color: "#DAA520",
                border: "1px solid rgba(218,165,32,0.3)",
                borderRadius: 4,
                cursor: "pointer",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                height: 40,
              }}
            >
              ▶▶
            </button>
          )}
        </div>
      </header>

      {/* Paper strip */}
      <main
        className="flex-1 overflow-y-auto"
        style={{
          background: "#1a1008",
          padding: "12px 8px",
        }}
      >
        <div
          className="mx-auto relative"
          style={{
            maxWidth: 520,
            display: "flex",
          }}
          onClick={() => printing && skipPrinting()}
        >
          {/* Left perforation */}
          <div
            className="flex-shrink-0"
            style={{
              width: 20,
              background: "linear-gradient(180deg, #f5f0e8 0%, #e8dfc8 100%)",
              backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.35) 3.5px, transparent 3.5px)",
              backgroundSize: "20px 18px",
              backgroundPosition: "10px 6px",
              borderRight: "1px dashed rgba(100,70,30,0.3)",
            }}
          />

          {/* Content */}
          <div
            className="flex-1 min-w-0"
            style={{
              background: "linear-gradient(180deg, #f5f0e8, #e8dfc8)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              padding: "16px 18px",
              fontFamily: "'Courier Prime', monospace",
              color: "#1a1008",
              fontSize: 13,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          >
            <div style={{ color: "#5a4020", fontSize: 11, marginBottom: 10, paddingBottom: 8, borderBottom: "1px dashed #c8b080" }}>
              {header}
            </div>
            {numbered}
            {printing && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.4, repeat: Infinity }}
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 12,
                  background: "#1a1008",
                  verticalAlign: "text-bottom",
                  marginLeft: 2,
                }}
              />
            )}
          </div>

          {/* Right perforation */}
          <div
            className="flex-shrink-0"
            style={{
              width: 20,
              background: "linear-gradient(180deg, #f5f0e8 0%, #e8dfc8 100%)",
              backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.35) 3.5px, transparent 3.5px)",
              backgroundSize: "20px 18px",
              backgroundPosition: "10px 6px",
              borderLeft: "1px dashed rgba(100,70,30,0.3)",
            }}
          />
        </div>

        {/* Tear line decoration */}
        {!printing && (
          <div
            className="mx-auto mt-2"
            style={{
              maxWidth: 520,
              height: 12,
              background: "repeating-linear-gradient(90deg, rgba(245,240,232,0.12) 0, rgba(245,240,232,0.12) 6px, transparent 6px, transparent 10px)",
              borderTop: "1px dashed rgba(138,112,80,0.5)",
              borderBottom: "1px dashed rgba(138,112,80,0.5)",
            }}
          />
        )}
      </main>

      {/* Actions */}
      <footer
        className="pb-safe flex-shrink-0"
        style={{
          background: "linear-gradient(180deg, #1a1008, #0d0805)",
          borderTop: "1px solid rgba(218,165,32,0.25)",
        }}
      >
        {confirmDelete ? (
          <div className="px-4 py-3">
            <div
              className="font-typewriter text-xs text-center mb-2"
              style={{ color: "#FF6644" }}
            >
              Удалить сообщение? Его нельзя будет восстановить.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 font-typewriter text-xs tap-target no-select"
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
              <button
                onClick={() => onDelete()}
                className="flex-1 font-typewriter text-xs tap-target no-select"
                style={{
                  background: "linear-gradient(135deg, #8B1A1A, #5a1010)",
                  color: "#f5e8c8",
                  border: "1px solid #8B1A1A",
                  borderRadius: 6,
                  padding: "12px",
                  cursor: "pointer",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                🗑 Удалить
              </button>
            </div>
          </div>
        ) : (
          <div
            className="px-3 py-3 grid gap-2"
            style={{
              gridTemplateColumns: isSystem ? "1fr 1fr" : "1fr 1fr 1fr",
            }}
          >
            {!isSystem && message.senderPhone && (
              <button
                onClick={onReply}
                className="font-typewriter text-[11px] tap-target no-select"
                style={{
                  background: "linear-gradient(135deg, #B8860B, #DAA520)",
                  color: "#1a1008",
                  border: "none",
                  borderRadius: 6,
                  padding: "12px 8px",
                  cursor: "pointer",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: "bold",
                }}
              >
                ✎ Ответить
              </button>
            )}
            {isInFolder ? (
              <button
                onClick={() => onPullFromFolder()}
                className="font-typewriter text-[11px] tap-target no-select"
                style={{
                  background: "rgba(218,165,32,0.1)",
                  color: "#DAA520",
                  border: "1px solid rgba(218,165,32,0.4)",
                  borderRadius: 6,
                  padding: "12px 8px",
                  cursor: "pointer",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                ↑ На стол
              </button>
            ) : (
              <button
                onClick={() => setShowPicker(true)}
                className="font-typewriter text-[11px] tap-target no-select"
                style={{
                  background: "rgba(218,165,32,0.1)",
                  color: "#DAA520",
                  border: "1px solid rgba(218,165,32,0.4)",
                  borderRadius: 6,
                  padding: "12px 8px",
                  cursor: "pointer",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                📁 В папку
              </button>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              className="font-typewriter text-[11px] tap-target no-select"
              style={{
                background: "rgba(139,26,26,0.15)",
                color: "#CC6666",
                border: "1px solid rgba(139,26,26,0.4)",
                borderRadius: 6,
                padding: "12px 8px",
                cursor: "pointer",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              🗑 Удалить
            </button>
          </div>
        )}
      </footer>

      <AnimatePresence>
        {showPicker && (
          <FolderPickerSheet
            key="picker"
            folders={folders}
            onPick={(folderId) => {
              setShowPicker(false);
              onFileToFolder(folderId);
            }}
            onClose={() => setShowPicker(false)}
            onCreateFolder={onCreateFolder}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
