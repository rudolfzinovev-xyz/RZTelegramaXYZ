"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Contact {
  id: string;
  name: string;
  username: string;
  phone: string;
  timezone: string;
  line?: number;
}

interface Props {
  currentUserId: string;
  onCall: (contact: Contact) => void;
  onMessage: (contact: Contact) => void;
}

export function ContactsTab({ currentUserId, onCall, onMessage }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users?exclude=${currentUserId}`)
      .then(r => r.json())
      .then(data => setContacts(Array.isArray(data) ? data : []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, [currentUserId]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.username.toLowerCase().includes(query) ||
      c.phone.includes(query)
    );
  }, [contacts, q]);

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Search */}
      <div
        className="sticky z-20 px-3 py-2"
        style={{
          top: 48,
          background: "linear-gradient(180deg, rgba(26,16,8,0.97), rgba(26,16,8,0.88))",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          borderBottom: "1px solid rgba(218,165,32,0.12)",
        }}
      >
        <div className="relative">
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Поиск по имени или номеру..."
            className="w-full font-courier px-4 py-3 rounded focus:outline-none tap-target"
            style={{
              background: "#0d0805",
              border: "1px solid #3a2a18",
              color: "#f5e8c8",
              fontSize: 14,
              paddingLeft: 40,
            }}
          />
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "#6a5030", fontSize: 14 }}
          >
            🔍
          </span>
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Очистить"
              className="absolute right-2 top-1/2 -translate-y-1/2 tap-target no-select"
              style={{
                width: 32, height: 32,
                background: "transparent", border: "none",
                color: "#8a6a4a", fontSize: 14, cursor: "pointer",
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="px-3 py-3 space-y-2">
        {loading && (
          <p className="text-center font-typewriter text-xs py-10" style={{ color: "#5a4020" }}>
            Загрузка...
          </p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-center font-typewriter text-xs py-10" style={{ color: "#5a4020" }}>
            {q ? "Никого не нашли" : "Нет абонентов"}
          </p>
        )}
        {filtered.map(contact => (
          <motion.button
            key={contact.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelected(contact)}
            className="w-full text-left no-select"
            style={{
              background: "linear-gradient(135deg, rgba(245,232,200,0.04), rgba(245,232,200,0.02))",
              border: "1px solid rgba(218,165,32,0.18)",
              borderRadius: 6,
              padding: "12px 14px",
              cursor: "pointer",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-full font-typewriter"
                style={{
                  width: 40, height: 40,
                  background: "linear-gradient(135deg, #5a3a1a, #3a2010)",
                  color: "#DAA520",
                  border: "1px solid #3a2a18",
                  fontSize: 14,
                  fontWeight: "bold",
                }}
              >
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-typewriter text-sm truncate" style={{ color: "#f5e8c8" }}>
                  {contact.name}
                </div>
                <div className="font-courier text-[11px]" style={{ color: "#8a7050" }}>
                  {contact.phone} · {contact.timezone}
                </div>
                {contact.line && (
                  <div className="font-typewriter text-[10px] font-bold" style={{ color: "#DAA520" }}>
                    ЛИНИЯ {contact.line}
                  </div>
                )}
              </div>
              <div
                className="font-typewriter text-[10px] tracking-widest flex-shrink-0"
                style={{ color: "#6a5030" }}
              >
                →
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Action sheet */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              onClick={e => e.stopPropagation()}
              className="absolute left-0 right-0 bottom-0 pb-safe"
              style={{
                background: "linear-gradient(180deg, #2a1a10, #1a1008)",
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                border: "1px solid rgba(218,165,32,0.3)",
                borderBottom: "none",
                boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
              }}
            >
              {/* Handle */}
              <div
                style={{
                  width: 40, height: 4, borderRadius: 2,
                  background: "#5a4020",
                  margin: "10px auto 12px",
                }}
              />
              <div className="px-5 pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-full font-typewriter"
                    style={{
                      width: 48, height: 48,
                      background: "linear-gradient(135deg, #5a3a1a, #3a2010)",
                      color: "#DAA520",
                      border: "1px solid #3a2a18",
                      fontSize: 18,
                      fontWeight: "bold",
                    }}
                  >
                    {selected.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-typewriter text-base truncate" style={{ color: "#f5e8c8" }}>
                      {selected.name}
                    </div>
                    <div className="font-courier text-xs" style={{ color: "#8a7050" }}>
                      @{selected.username}
                    </div>
                    <div className="font-courier text-[11px]" style={{ color: "#6a5030" }}>
                      {selected.phone} · {selected.timezone}
                    </div>
                    {selected.line && (
                      <div className="font-typewriter text-[10px] font-bold" style={{ color: "#DAA520" }}>
                        ЛИНИЯ {selected.line}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => { onCall(selected); setSelected(null); }}
                    className="w-full font-typewriter text-sm tracking-wider tap-target no-select"
                    style={{
                      background: "linear-gradient(135deg, #1a5a1a, #0a3a0a)",
                      color: "#90EE90",
                      border: "1px solid #228B22",
                      borderRadius: 8,
                      padding: "14px",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                    }}
                  >
                    ☎ Позвонить
                  </button>
                  <button
                    onClick={() => { onMessage(selected); setSelected(null); }}
                    className="w-full font-typewriter text-sm tracking-wider tap-target no-select"
                    style={{
                      background: "linear-gradient(135deg, #B8860B, #DAA520)",
                      color: "#1a1008",
                      border: "none",
                      borderRadius: 8,
                      padding: "14px",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                    }}
                  >
                    ✎ Написать
                  </button>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-full font-typewriter text-sm tap-target no-select"
                    style={{
                      background: "transparent",
                      color: "#8a6a4a",
                      border: "1px solid #3a2a18",
                      borderRadius: 8,
                      padding: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
