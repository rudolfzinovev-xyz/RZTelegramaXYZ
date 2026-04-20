"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatInTZ } from "@/lib/tz";
import type { MobileMessage, MobileFolder, MobileUser } from "@/app/desk/MobileDeskClient";
import { FolderPickerSheet } from "./FolderPickerSheet";

interface Props {
  user: MobileUser;
  trashedMessages: MobileMessage[];
  folders: MobileFolder[];
  timezone: string;
  onOpenMessage: (message: MobileMessage) => void;
  onDeleteMessage: (msgId: string) => void;
  onFileToFolder: (msgId: string, folderId: string) => void;
  onLogout: () => void;
}

export function MoreTab({
  user, trashedMessages, folders, timezone,
  onOpenMessage, onDeleteMessage, onFileToFolder, onLogout,
}: Props) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [pickerForMsg, setPickerForMsg] = useState<string | null>(null);

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Account card */}
      <section className="px-4 pt-4">
        <div
          style={{
            background: "linear-gradient(135deg, rgba(218,165,32,0.08), rgba(184,134,11,0.04))",
            border: "1px solid rgba(218,165,32,0.25)",
            borderRadius: 8,
            padding: "16px",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-full font-typewriter"
              style={{
                width: 56, height: 56,
                background: "linear-gradient(135deg, #B8860B, #DAA520, #8a6608)",
                color: "#1a1008",
                fontSize: 22,
                fontWeight: "bold",
                border: "2px solid #5a4008",
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-typewriter text-base" style={{ color: "#f5e8c8" }}>
                {user.name}
              </div>
              <div className="font-courier text-xs" style={{ color: "#8a7050" }}>
                {user.phone}
              </div>
              <div className="font-courier text-[11px]" style={{ color: "#6a5030" }}>
                Канал: {user.timezone}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Missed / trashed inbox */}
      <section className="pt-5">
        <div className="flex items-baseline justify-between px-4 py-2">
          <span
            className="font-typewriter tracking-[0.2em] uppercase"
            style={{ color: "#DAA520", fontSize: 11 }}
          >
            Неполученные
          </span>
          <span className="font-courier text-[10px]" style={{ color: "#6a5030" }}>
            {trashedMessages.length}
          </span>
        </div>
        <div className="px-3 space-y-2">
          {trashedMessages.length === 0 ? (
            <p className="text-center font-typewriter text-xs py-6" style={{ color: "#5a4020" }}>
              Корзина пуста
            </p>
          ) : (
            trashedMessages.map(msg => (
              <div
                key={msg.id}
                className="relative"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid #2a1a10",
                  borderRadius: 6,
                  padding: "12px 14px",
                  filter: "sepia(25%) brightness(0.9)",
                }}
              >
                <button
                  onClick={() => onOpenMessage(msg)}
                  className="block w-full text-left no-select"
                  style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", color: "inherit" }}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span
                      className="font-typewriter text-sm truncate"
                      style={{ color: "#c8b890" }}
                    >
                      {msg.senderName}
                    </span>
                    <span className="font-courier text-[10px] flex-shrink-0" style={{ color: "#6a5030" }}>
                      {formatInTZ(msg.createdAt, timezone)}
                    </span>
                  </div>
                  <div
                    className="font-courier text-[12px] leading-snug"
                    style={{ color: "#8a7050", wordBreak: "break-word" }}
                  >
                    {msg.content.length > 120 ? msg.content.slice(0, 120) + "…" : msg.content}
                  </div>
                </button>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setPickerForMsg(msg.id)}
                    className="font-typewriter text-[10px] tap-target no-select flex-1"
                    style={{
                      background: "rgba(218,165,32,0.08)",
                      color: "#DAA520",
                      border: "1px solid rgba(218,165,32,0.3)",
                      borderRadius: 4,
                      padding: "8px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    📁 В папку
                  </button>
                  <button
                    onClick={() => onDeleteMessage(msg.id)}
                    className="font-typewriter text-[10px] tap-target no-select flex-1"
                    style={{
                      background: "rgba(139,26,26,0.15)",
                      color: "#CC6666",
                      border: "1px solid rgba(139,26,26,0.4)",
                      borderRadius: 4,
                      padding: "8px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    🗑 Удалить
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* About / security */}
      <section className="pt-5 px-4">
        <div className="flex items-baseline justify-between py-2">
          <span
            className="font-typewriter tracking-[0.2em] uppercase"
            style={{ color: "#DAA520", fontSize: 11 }}
          >
            О системе
          </span>
        </div>
        <div
          className="font-courier text-[11px] leading-relaxed"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(218,165,32,0.15)",
            borderRadius: 6,
            padding: "12px 14px",
            color: "#8a7050",
          }}
        >
          <div style={{ color: "#c8b890" }}>🔒 Сквозное шифрование</div>
          <div className="mt-1">Сообщения шифруются на устройстве и читаются только получателем. Сервер видит только зашифрованные блобы.</div>
          <div className="mt-3" style={{ color: "#c8b890" }}>📡 Часовой пояс — линия</div>
          <div className="mt-1">Чтобы дозвониться, нужно подключить кабель к нужному каналу собеседника.</div>
        </div>
      </section>

      {/* Logout */}
      <section className="pt-5 px-4 pb-4">
        {!confirmLogout ? (
          <button
            onClick={() => setConfirmLogout(true)}
            className="w-full font-typewriter text-sm tracking-wider tap-target no-select"
            style={{
              background: "transparent",
              color: "#CC6666",
              border: "1px solid rgba(139,26,26,0.5)",
              borderRadius: 8,
              padding: "14px",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            ⏻ Выйти из системы
          </button>
        ) : (
          <div
            style={{
              background: "rgba(60,10,10,0.3)",
              border: "1px solid #8B1A1A",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div
              className="font-typewriter text-center text-sm mb-3"
              style={{ color: "#FF6644" }}
            >
              Точно выйти?
            </div>
            <div className="font-courier text-[11px] text-center mb-3" style={{ color: "#8a7050" }}>
              Приватный ключ будет удалён из этого устройства.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmLogout(false)}
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
                onClick={onLogout}
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
                Выйти
              </button>
            </div>
          </div>
        )}
      </section>

      <AnimatePresence>
        {pickerForMsg && (
          <FolderPickerSheet
            key="picker"
            folders={folders}
            onPick={(folderId) => {
              const msg = pickerForMsg;
              setPickerForMsg(null);
              if (msg) onFileToFolder(msg, folderId);
            }}
            onClose={() => setPickerForMsg(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
