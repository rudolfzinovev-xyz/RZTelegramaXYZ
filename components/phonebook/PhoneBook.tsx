"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Contact {
  id: string;
  name: string;
  username: string;
  phone: string;
  timezone: string;
  line?: number;
}

interface PhoneBookProps {
  currentUserId: string;
  onCallContact?: (contact: Contact) => void;
  onMessageContact?: (contact: Contact) => void;
}

export function PhoneBook({ currentUserId, onCallContact, onMessageContact }: PhoneBookProps) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/users?exclude=${currentUserId}`)
      .then((r) => r.json())
      .then((data) => { setContacts(Array.isArray(data) ? data : []); })
      .finally(() => setLoading(false));
  }, [open, currentUserId]);

  return (
    <>
      {/* Closed phone book */}
      <motion.div
        className="relative cursor-pointer select-none"
        whileHover={{ scale: 1.03, rotate: 1 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        title="Телефонная книга"
      >
        <div
          style={{
            width: 130,
            height: 170,
            background: "linear-gradient(135deg, #6B3A2A 0%, #4a2218 50%, #5a2e1e 100%)",
            borderRadius: "4px 8px 8px 4px",
            boxShadow: "4px 6px 16px rgba(0,0,0,0.5), -2px 0 0 #3a1a10, inset 0 1px 0 rgba(255,255,255,0.05)",
            border: "1px solid #3a1a10",
            position: "relative",
          }}
        >
          <div
            className="absolute left-0 top-0 bottom-0"
            style={{ width: 14, background: "linear-gradient(180deg, #3a1a10, #2a1008)", borderRadius: "4px 0 0 4px" }}
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
            ТЕЛЕФОННАЯ<br />КНИГА
          </div>

          {["А", "Б", "В", "Г"].map((letter, i) => (
            <div
              key={letter}
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
          СПРАВОЧНИК
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
                width: 400,
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
                style={{ background: "linear-gradient(135deg, #6B3A2A, #4a2218)", borderBottom: "2px solid #3a1a10" }}
              >
                <span className="font-typewriter text-[#DAA520] tracking-widest uppercase text-sm">
                  Телефонная книга
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
                  <p className="text-center font-typewriter text-xs text-[#8a6a4a] py-8">Нет абонентов</p>
                )}
                {contacts.map((contact) => (
                    <motion.div
                      key={contact.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 rounded"
                      style={{ background: "#f0ead8", border: "1px solid #c8b89a" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-typewriter text-[#1a1008] text-sm truncate">{contact.name}</div>
                          <div className="font-courier text-xs text-[#5a3a1a]">@{contact.username}</div>
                          <div className="font-courier text-xs text-[#8a6a4a]">{contact.phone} · {contact.timezone}</div>
                          {contact.line && (
                            <div className="font-courier text-xs font-bold" style={{ color: "#DAA520" }}>ЛИНИЯ {contact.line}</div>
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
                        </div>
                      </div>
                    </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
