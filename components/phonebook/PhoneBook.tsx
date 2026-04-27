"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Contact {
  id: string;
  name: string;
  username: string;
  phone: string;
  timezone: string;
  line?: number;
  bio?: string | null;
  isContact?: boolean;
}

interface PhoneBookProps {
  currentUserId: string;
  // "all"  — every user (the справочник)
  // "saved" — only entries the user has marked as a contact
  variant?: "all" | "saved";
  onCallContact?: (contact: Contact) => void;
  onMessageContact?: (contact: Contact) => void;
  onContactsChanged?: () => void;
  refreshKey?: number;
}

export function PhoneBook({
  currentUserId,
  variant = "all",
  onCallContact,
  onMessageContact,
  onContactsChanged,
  refreshKey,
}: PhoneBookProps) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const url = variant === "saved" ? "/api/contacts" : `/api/users?exclude=${currentUserId}`;
      const r = await fetch(url);
      const data = await r.json();
      setContacts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [variant, currentUserId]);

  useEffect(() => {
    if (open) reload();
  }, [open, reload, refreshKey]);

  async function toggleSaved(c: Contact) {
    setBusyId(c.id);
    try {
      if (c.isContact || variant === "saved") {
        await fetch(`/api/contacts?contactId=${c.id}`, { method: "DELETE" });
      } else {
        await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId: c.id }),
        });
      }
      await reload();
      onContactsChanged?.();
    } finally {
      setBusyId(null);
    }
  }

  const isSaved = variant === "saved";
  const bookColor = isSaved
    ? "linear-gradient(135deg, #2A4A6B 0%, #18324a 50%, #1e3a5a 100%)"
    : "linear-gradient(135deg, #6B3A2A 0%, #4a2218 50%, #5a2e1e 100%)";
  const spineColor = isSaved
    ? "linear-gradient(180deg, #102438, #08182a)"
    : "linear-gradient(180deg, #3a1a10, #2a1008)";
  const headerBg = isSaved
    ? "linear-gradient(135deg, #2A4A6B, #18324a)"
    : "linear-gradient(135deg, #6B3A2A, #4a2218)";
  const headerBorder = isSaved ? "2px solid #08182a" : "2px solid #3a1a10";
  const labelLine1 = isSaved ? "КНИГА" : "ТЕЛЕФОННАЯ";
  const labelLine2 = isSaved ? "КОНТАКТОВ" : "КНИГА";
  const closedLabel = isSaved ? "КОНТАКТЫ" : "СПРАВОЧНИК";
  const headerTitle = isSaved ? "Книга контактов" : "Телефонная книга";
  const emptyText = isSaved
    ? "Никого не отмечено. Откройте справочник и пометьте абонента красным карандашом."
    : "Нет абонентов";

  return (
    <>
      {/* Closed book */}
      <motion.div
        className="relative cursor-pointer select-none"
        whileHover={{ scale: 1.03, rotate: isSaved ? -1 : 1 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        title={headerTitle}
      >
        <div
          style={{
            width: 130,
            height: 170,
            background: bookColor,
            borderRadius: "4px 8px 8px 4px",
            boxShadow: "4px 6px 16px rgba(0,0,0,0.5), -2px 0 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
            border: "1px solid rgba(0,0,0,0.5)",
            position: "relative",
          }}
        >
          <div
            className="absolute left-0 top-0 bottom-0"
            style={{ width: 14, background: spineColor, borderRadius: "4px 0 0 4px" }}
          />
          <div
            className="absolute font-typewriter text-center"
            style={{
              color: "#DAA520",
              fontSize: 10,
              letterSpacing: "0.15em",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              lineHeight: 1.4,
              width: 90,
            }}
          >
            {labelLine1}<br />{labelLine2}
          </div>

          {(isSaved ? ["✦", "★", "✦", "★"] : ["А", "Б", "В", "Г"]).map((letter, i) => (
            <div
              key={i}
              className="absolute right-0 flex items-center justify-center font-typewriter text-[8px]"
              style={{
                width: 16,
                height: 22,
                background: i % 2 === 0 ? "#DAA520" : "#B8860B",
                color: "#1a1008",
                top: 20 + i * 28,
                borderRadius: "0 3px 3px 0",
              }}
            >
              {letter}
            </div>
          ))}
        </div>

        <div className="text-center font-typewriter text-xs tracking-widest mt-1" style={{ color: "#DAA520" }}>
          {closedLabel}
        </div>
      </motion.div>

      {/* Open modal */}
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
              initial={{ scale: 0.8, rotateY: -30 }}
              animate={{ scale: 1, rotateY: 0 }}
              exit={{ scale: 0.8, rotateY: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 420,
                maxHeight: "70vh",
                background: "linear-gradient(135deg, #f5f0e8 0%, #e8dfc8 100%)",
                borderRadius: "4px 8px 8px 4px",
                boxShadow: "8px 12px 40px rgba(0,0,0,0.6)",
                border: "1px solid #c8b89a",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                style={{ background: headerBg, borderBottom: headerBorder }}
              >
                <span className="font-typewriter text-[#DAA520] tracking-widest uppercase text-sm">
                  {headerTitle}
                </span>
                <button onClick={() => setOpen(false)} className="font-typewriter text-[#DAA520] hover:text-white text-lg">
                  ✕
                </button>
              </div>

              {/* Contacts list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading && (
                  <p className="text-center font-typewriter text-xs text-[#8a6a4a] py-8">Загрузка...</p>
                )}
                {!loading && contacts.length === 0 && (
                  <p className="text-center font-typewriter text-xs text-[#8a6a4a] py-8 px-4">{emptyText}</p>
                )}
                {contacts.map((contact) => {
                  const marked = isSaved || contact.isContact;
                  return (
                    <motion.div
                      key={contact.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="relative p-3 rounded"
                      style={{
                        background: "#f0ead8",
                        border: marked ? "2px solid #c43a2a" : "1px solid #c8b89a",
                        boxShadow: marked ? "1px 1px 0 #c43a2a, -1px -1px 0 rgba(196,58,42,0.4)" : "none",
                        transform: marked ? "rotate(-0.3deg)" : "none",
                      }}
                    >
                      {marked && (
                        <div
                          aria-hidden
                          className="absolute pointer-events-none font-typewriter"
                          style={{
                            top: -6,
                            right: 8,
                            color: "#c43a2a",
                            fontSize: 14,
                            transform: "rotate(8deg)",
                          }}
                        >
                          ✓
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-typewriter text-[#1a1008] text-sm truncate">{contact.name}</div>
                          <div className="font-courier text-xs text-[#5a3a1a]">@{contact.username}</div>
                          <div className="font-courier text-xs text-[#8a6a4a]">{contact.phone} · {contact.timezone}</div>
                          {contact.line && (
                            <div className="font-courier text-xs font-bold" style={{ color: "#DAA520" }}>ЛИНИЯ {contact.line}</div>
                          )}
                          {contact.bio && (
                            <div
                              className="font-typewriter italic"
                              style={{ color: "#5a3a1a", fontSize: 11, marginTop: 4, lineHeight: 1.3 }}
                            >
                              «{contact.bio}»
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button
                            onClick={() => { onCallContact?.(contact); setOpen(false); }}
                            className="px-2 py-1 text-[10px] font-typewriter tracking-wider uppercase"
                            style={{ background: "linear-gradient(135deg, #1a5a1a, #0a3a0a)", color: "#90EE90", border: "none", borderRadius: "3px", cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            Звонок
                          </button>
                          <button
                            onClick={() => { onMessageContact?.(contact); setOpen(false); }}
                            className="px-2 py-1 text-[10px] font-typewriter tracking-wider uppercase"
                            style={{ background: "linear-gradient(135deg, #1a1a5a, #0a0a3a)", color: "#ADD8E6", border: "none", borderRadius: "3px", cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            Телетайп
                          </button>
                          <button
                            onClick={() => toggleSaved(contact)}
                            disabled={busyId === contact.id}
                            className="px-2 py-1 text-[10px] font-typewriter tracking-wider uppercase"
                            style={{
                              background: marked ? "rgba(196,58,42,0.12)" : "transparent",
                              color: "#c43a2a",
                              border: "1px solid #c43a2a",
                              borderRadius: "3px",
                              cursor: busyId === contact.id ? "wait" : "pointer",
                              whiteSpace: "nowrap",
                            }}
                            title={marked ? "Убрать из контактов" : "Отметить красным карандашом"}
                          >
                            {marked ? "✕ Убрать" : "✎ В контакты"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
