"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
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

interface Props {
  currentUserId: string;
  onCall: (contact: Contact) => void;
  onMessage: (contact: Contact) => void;
}

type Mode = "all" | "saved";

export function ContactsTab({ currentUserId, onCall, onMessage }: Props) {
  const [mode, setMode] = useState<Mode>("all");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [savedContacts, setSavedContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, savedRes] = await Promise.all([
        fetch(`/api/users?exclude=${currentUserId}`),
        fetch("/api/contacts"),
      ]);
      const allData = allRes.ok ? await allRes.json() : [];
      const savedData = savedRes.ok ? await savedRes.json() : [];
      setContacts(Array.isArray(allData) ? allData : []);
      setSavedContacts(Array.isArray(savedData) ? savedData : []);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => { reload(); }, [reload]);

  async function toggleSaved(c: Contact) {
    setBusy(true);
    try {
      const isSaved = savedContacts.some(s => s.id === c.id);
      if (isSaved) {
        await fetch(`/api/contacts?contactId=${c.id}`, { method: "DELETE" });
      } else {
        await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId: c.id }),
        });
      }
      await reload();
    } finally {
      setBusy(false);
    }
  }

  const list = mode === "saved" ? savedContacts : contacts;
  const savedIds = useMemo(() => new Set(savedContacts.map(s => s.id)), [savedContacts]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.username.toLowerCase().includes(query) ||
      c.phone.includes(query)
    );
  }, [list, q]);

  const selectedIsSaved = selected ? savedIds.has(selected.id) : false;

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Mode toggle */}
      <div
        className="sticky z-20 px-3 pt-2 pb-1"
        style={{
          top: 48,
          background: "linear-gradient(180deg, rgba(26,16,8,0.97), rgba(26,16,8,0.88))",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      >
        <div
          className="grid grid-cols-2 gap-1 rounded p-1"
          style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(218,165,32,0.18)" }}
        >
          {(["all", "saved"] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="font-typewriter text-[11px] tap-target no-select"
              style={{
                background: mode === m ? "linear-gradient(135deg, #B8860B, #DAA520)" : "transparent",
                color: mode === m ? "#1a1008" : "#8a7050",
                border: "none",
                borderRadius: 4,
                padding: "8px",
                cursor: "pointer",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontWeight: mode === m ? "bold" : "normal",
              }}
            >
              {m === "all" ? `Справочник · ${contacts.length}` : `Контакты · ${savedContacts.length}`}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div
        className="sticky z-20 px-3 py-2"
        style={{
          top: 96,
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
          <p className="text-center font-typewriter text-xs py-10 px-4" style={{ color: "#5a4020" }}>
            {q
              ? "Никого не нашли"
              : mode === "saved"
                ? "Никого не отмечено. Откройте справочник и пометьте абонента красным карандашом."
                : "Нет абонентов"}
          </p>
        )}
        {filtered.map(contact => {
          const marked = savedIds.has(contact.id);
          return (
          <motion.button
            key={contact.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelected(contact)}
            className="w-full text-left no-select relative"
            style={{
              background: "linear-gradient(135deg, rgba(245,232,200,0.04), rgba(245,232,200,0.02))",
              border: marked ? "2px solid #c43a2a" : "1px solid rgba(218,165,32,0.18)",
              borderRadius: 6,
              padding: "12px 14px",
              cursor: "pointer",
              boxShadow: marked ? "1px 1px 0 rgba(196,58,42,0.6), -1px -1px 0 rgba(196,58,42,0.3)" : "none",
              transform: marked ? "rotate(-0.2deg)" : "none",
            }}
          >
            {marked && (
              <span
                aria-hidden
                className="absolute font-typewriter"
                style={{
                  top: -8,
                  right: 10,
                  color: "#c43a2a",
                  fontSize: 14,
                  transform: "rotate(8deg)",
                  pointerEvents: "none",
                }}
              >
                ✓
              </span>
            )}
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
                {contact.bio && (
                  <div
                    className="font-typewriter italic truncate"
                    style={{ color: "#a89878", fontSize: 11, marginTop: 2, lineHeight: 1.3 }}
                  >
                    «{contact.bio}»
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
          );
        })}
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
                    {selected.bio && (
                      <div
                        className="font-typewriter italic"
                        style={{ color: "#a89878", fontSize: 11, marginTop: 4, lineHeight: 1.3 }}
                      >
                        «{selected.bio}»
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
                    onClick={async () => { if (selected) { await toggleSaved(selected); setSelected(null); } }}
                    disabled={busy}
                    className="w-full font-typewriter text-sm tracking-wider tap-target no-select"
                    style={{
                      background: selectedIsSaved ? "rgba(196,58,42,0.12)" : "transparent",
                      color: "#c43a2a",
                      border: "1px solid #c43a2a",
                      borderRadius: 8,
                      padding: "14px",
                      cursor: busy ? "wait" : "pointer",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                    }}
                  >
                    {selectedIsSaved ? "✕ Убрать из контактов" : "✎ В книгу контактов"}
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
