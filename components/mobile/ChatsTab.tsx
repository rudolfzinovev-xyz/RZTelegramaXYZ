"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatInTZ } from "@/lib/tz";
import type { MobileMessage, MobileFolder } from "@/app/desk/MobileDeskClient";
import { MobileTeletype } from "./MobileTeletype";

interface Props {
  timezone: string;
  folders: MobileFolder[];
  loosePapers: MobileMessage[];
  unreadIds: Set<string>;
  sendStatus: "idle" | "sending" | "delivered";
  onOpenMessage: (message: MobileMessage, fromFolderId?: string | null) => void;
  onOpenCompose: () => void;
  onCreateFolder: (label: string) => void;
  onPullFromFolder: (msgId: string, folderId: string) => void;
  onDeleteMessage: (msgId: string) => void;
}

function snippet(content: string, n = 80) {
  const flat = content.replace(/\n+/g, " · ").trim();
  return flat.length > n ? flat.slice(0, n) + "…" : flat;
}

export function ChatsTab({
  timezone, folders, loosePapers, unreadIds, sendStatus,
  onOpenMessage, onOpenCompose, onCreateFolder,
  onPullFromFolder, onDeleteMessage,
}: Props) {
  const unreadLoose = loosePapers.filter(p => unreadIds.has(p.id));
  const latestUnread = unreadLoose.length > 0
    ? [...unreadLoose].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const selectedFolder = expandedFolder ? folders.find(f => f.id === expandedFolder) : null;

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    onCreateFolder(newLabel.trim());
    setNewLabel("");
    setCreatingFolder(false);
  }

  if (selectedFolder) {
    return (
      <div style={{ paddingBottom: 80 }}>
        {/* Folder detail header */}
        <div
          className="sticky z-20 px-4 py-3 flex items-center gap-3"
          style={{
            top: 48,
            background: "linear-gradient(180deg, rgba(26,16,8,0.97), rgba(26,16,8,0.88))",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            borderBottom: "1px solid rgba(218,165,32,0.12)",
          }}
        >
          <button
            onClick={() => setExpandedFolder(null)}
            className="font-typewriter text-xs tap-target px-3 py-2 no-select"
            style={{
              background: "rgba(218,165,32,0.08)",
              color: "#DAA520",
              border: "1px solid rgba(218,165,32,0.3)",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            ← Назад
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-typewriter text-sm tracking-wider truncate" style={{ color: "#f5e8c8" }}>
              📁 {selectedFolder.label}
            </div>
            <div className="font-courier text-[10px]" style={{ color: "#8a6a4a" }}>
              {selectedFolder.messages.length} сообщ.
            </div>
          </div>
        </div>

        <div className="px-3 py-3 space-y-2">
          {selectedFolder.messages.length === 0 ? (
            <p className="text-center font-typewriter text-xs py-10" style={{ color: "#5a4020" }}>
              Папка пуста
            </p>
          ) : (
            [...selectedFolder.messages]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((msg) => (
                <MessageRow
                  key={msg.id}
                  msg={msg}
                  timezone={timezone}
                  unread={false}
                  onOpen={() => onOpenMessage(msg, selectedFolder.id)}
                />
              ))
          )}
        </div>
      </div>
    );
  }

  const hasContent = folders.length > 0 || loosePapers.length > 0;

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Teletype machine — the centerpiece */}
      <div className="pt-3 pb-1">
        <MobileTeletype
          hasIncoming={unreadLoose.length > 0}
          unreadCount={unreadLoose.length}
          latestSender={latestUnread?.senderName}
          sendStatus={sendStatus}
          onOpenLatest={() => latestUnread && onOpenMessage(latestUnread, null)}
        />
      </div>

      {/* Loose papers (desk) */}
      {loosePapers.length > 0 && (
        <section className="pt-3">
          <SectionTitle
            title="На столе"
            subtitle={`${loosePapers.length} · не разложено`}
          />
          <div className="px-3 space-y-2">
            {[...loosePapers]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(msg => (
                <MessageRow
                  key={msg.id}
                  msg={msg}
                  timezone={timezone}
                  unread={unreadIds.has(msg.id)}
                  onOpen={() => onOpenMessage(msg, null)}
                  onDelete={() => onDeleteMessage(msg.id)}
                />
              ))}
          </div>
        </section>
      )}

      {/* Folders */}
      <section className="pt-4">
        <SectionTitle
          title="Архив"
          subtitle={`${folders.length} папок`}
          action={
            !creatingFolder && (
              <button
                onClick={() => setCreatingFolder(true)}
                className="font-typewriter text-[10px] px-2 py-1 no-select"
                style={{
                  background: "rgba(218,165,32,0.12)",
                  border: "1px solid rgba(218,165,32,0.4)",
                  color: "#DAA520",
                  borderRadius: 4,
                  cursor: "pointer",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                + Папка
              </button>
            )
          }
        />

        <AnimatePresence>
          {creatingFolder && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreate}
              className="px-3 mb-2 flex gap-2"
            >
              <input
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
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
                  letterSpacing: "0.1em",
                }}
              >
                ОК
              </button>
              <button
                type="button"
                onClick={() => { setCreatingFolder(false); setNewLabel(""); }}
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
            </motion.form>
          )}
        </AnimatePresence>

        {folders.length === 0 && !creatingFolder ? (
          <p className="text-center font-typewriter text-xs py-6 px-4" style={{ color: "#5a4020" }}>
            Создай папку, чтобы разложить сообщения
          </p>
        ) : (
          <div className="px-3 space-y-2">
            {folders.map(folder => (
              <FolderRow
                key={folder.id}
                folder={folder}
                timezone={timezone}
                onOpen={() => setExpandedFolder(folder.id)}
              />
            ))}
          </div>
        )}
      </section>

      {!hasContent && (
        <div
          className="text-center px-6 pt-16"
          style={{ color: "#5a4020" }}
        >
          <div className="font-typewriter text-5xl mb-4" style={{ opacity: 0.4 }}>📡</div>
          <div className="font-typewriter text-sm tracking-widest uppercase mb-2" style={{ color: "#8a6a4a" }}>
            Лента пуста
          </div>
          <div className="font-courier text-xs" style={{ color: "#6a5030" }}>
            Нажмите «+», чтобы отправить первое сообщение
          </div>
        </div>
      )}

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onOpenCompose}
        aria-label="Написать сообщение"
        className="fixed z-30 no-select"
        style={{
          right: 20,
          bottom: "calc(80px + env(safe-area-inset-bottom))",
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #DAA520 0%, #B8860B 60%, #8a6608 100%)",
          border: "2px solid #5a4008",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5), 0 0 12px rgba(218,165,32,0.3)",
          color: "#1a1008",
          fontFamily: "'Special Elite', monospace",
          fontSize: 28,
          fontWeight: "bold",
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        ✎
      </motion.button>
    </div>
  );
}

function SectionTitle({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between px-4 py-2">
      <div className="flex items-baseline gap-2">
        <span
          className="font-typewriter tracking-[0.2em] uppercase"
          style={{ color: "#DAA520", fontSize: 11 }}
        >
          {title}
        </span>
        {subtitle && (
          <span className="font-courier text-[10px]" style={{ color: "#6a5030" }}>
            · {subtitle}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

function MessageRow({
  msg, timezone, unread, onOpen, onDelete,
}: {
  msg: MobileMessage;
  timezone: string;
  unread: boolean;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className="relative cursor-pointer no-select"
      style={{
        background: unread
          ? "linear-gradient(135deg, rgba(218,165,32,0.1), rgba(184,134,11,0.05))"
          : "linear-gradient(135deg, rgba(245,232,200,0.04), rgba(245,232,200,0.02))",
        border: `1px solid ${unread ? "#DAA520" : "rgba(218,165,32,0.15)"}`,
        borderLeft: unread ? "3px solid #DAA520" : "1px solid rgba(218,165,32,0.15)",
        borderRadius: 6,
        padding: "12px 14px",
        boxShadow: unread ? "0 0 12px rgba(218,165,32,0.15)" : "none",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="font-typewriter text-sm tracking-wider truncate"
              style={{ color: unread ? "#f5e8c8" : "#c8b890" }}
            >
              {msg.senderName}
            </span>
            {unread && (
              <span
                style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#DAA520",
                  boxShadow: "0 0 4px #DAA520",
                  flexShrink: 0,
                }}
              />
            )}
          </div>
          <div className="font-courier text-[10px]" style={{ color: "#6a5030" }}>
            {msg.senderPhone}{msg.senderTimezone ? ` · ${msg.senderTimezone}` : ""}
          </div>
        </div>
        <div className="flex-shrink-0 font-courier text-[10px]" style={{ color: "#6a5030" }}>
          {formatInTZ(msg.createdAt, timezone, { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}
        </div>
      </div>
      <div
        className="font-courier text-[13px] leading-snug"
        style={{ color: unread ? "#e8d8a8" : "#a8987a", wordBreak: "break-word" }}
      >
        {snippet(msg.content)}
      </div>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="Удалить"
          className="absolute top-2 right-2 tap-target no-select"
          style={{
            width: 32, height: 32,
            background: "transparent",
            border: "none",
            color: "#6a5030",
            fontSize: 14,
            cursor: "pointer",
            opacity: 0.6,
          }}
        >
          🗑
        </button>
      )}
    </motion.div>
  );
}

function FolderRow({
  folder, timezone, onOpen,
}: { folder: MobileFolder; timezone: string; onOpen: () => void }) {
  const latest = folder.messages.length > 0
    ? [...folder.messages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className="w-full text-left no-select"
      style={{
        background: "linear-gradient(135deg, rgba(200,180,144,0.12), rgba(160,136,96,0.08))",
        border: "1px solid rgba(200,180,144,0.25)",
        borderRadius: 6,
        padding: "12px 14px",
        cursor: "pointer",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          style={{
            fontSize: 24,
            flexShrink: 0,
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
          }}
        >
          📁
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className="font-typewriter text-sm tracking-wider truncate"
              style={{ color: "#f0dcb0" }}
            >
              {folder.label}
            </span>
            <span
              className="font-courier text-[10px] flex-shrink-0"
              style={{ color: "#8a7050" }}
            >
              {folder.messages.length} л.
            </span>
          </div>
          {latest ? (
            <div
              className="font-courier text-[11px] truncate mt-0.5"
              style={{ color: "#8a7050" }}
            >
              {latest.senderName}: {snippet(latest.content, 40)}
            </div>
          ) : (
            <div className="font-courier text-[11px]" style={{ color: "#5a4020" }}>
              пусто
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}
