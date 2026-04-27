"use client";
import { useCallback, useEffect, useState } from "react";

interface OwnedBot {
  id: string;
  name: string;
  username: string;
  bio?: string | null;
  createdAt: string;
}

// Compact bot manager — used from MoreTab (mobile) and a desktop modal.
// Lists user's bots, lets them create new ones, regenerate the token,
// and delete. The plaintext token is shown ONCE on creation/regenerate.
export function BotManager() {
  const [bots, setBots] = useState<OwnedBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ username: "", name: "", bio: "" });
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState<{ id: string; token: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/bots/mine");
      const data = r.ok ? await r.json() : [];
      setBots(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка создания");
        return;
      }
      setShowToken({ id: data.id, token: data.token });
      setForm({ username: "", name: "", bio: "" });
      await reload();
    } finally {
      setCreating(false);
    }
  }

  async function handleRegenerate(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/bots/${id}/regenerate`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setShowToken({ id, token: data.token });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить бота? Его сообщения и токен пропадут.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/bots/${id}`, { method: "DELETE" });
      if (res.ok) await reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {/* Token reveal panel — shown once per creation/regenerate */}
      {showToken && (
        <div
          className="mb-3"
          style={{
            background: "rgba(34,139,34,0.1)",
            border: "2px solid #228B22",
            borderRadius: 6,
            padding: 12,
          }}
        >
          <div className="font-typewriter tracking-widest uppercase mb-1" style={{ color: "#90EE90", fontSize: 10 }}>
            Токен — сохраните его
          </div>
          <div className="font-courier break-all" style={{ color: "#f5e8c8", fontSize: 11, wordBreak: "break-all" }}>
            {showToken.token}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => navigator.clipboard?.writeText(showToken.token)}
              className="font-typewriter text-[10px] px-3 py-1"
              style={{
                background: "linear-gradient(135deg, #B8860B, #DAA520)",
                color: "#1a1008",
                border: "none",
                borderRadius: 3,
                cursor: "pointer",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Копировать
            </button>
            <button
              onClick={() => setShowToken(null)}
              className="font-typewriter text-[10px] px-3 py-1"
              style={{
                background: "transparent",
                color: "#8a6a4a",
                border: "1px solid #3a2a18",
                borderRadius: 3,
                cursor: "pointer",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Закрыл
            </button>
          </div>
          <div className="font-courier mt-2" style={{ color: "#5a4020", fontSize: 9 }}>
            Больше токен показан не будет. При утере — Перевыпустить.
          </div>
        </div>
      )}

      {/* Create form */}
      <form onSubmit={handleCreate} className="space-y-2 mb-4">
        <div className="font-typewriter tracking-widest uppercase" style={{ color: "#DAA520", fontSize: 10 }}>
          Новый бот
        </div>
        <input
          type="text"
          value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          placeholder="username (3–30, латиница/_)"
          className="w-full font-courier focus:outline-none"
          style={{
            background: "#0d0805",
            border: "1px solid #3a2a18",
            color: "#f5e8c8",
            fontSize: 12,
            padding: "8px 10px",
            borderRadius: 4,
          }}
        />
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Имя (как видят пользователи)"
          className="w-full font-courier focus:outline-none"
          style={{
            background: "#0d0805",
            border: "1px solid #3a2a18",
            color: "#f5e8c8",
            fontSize: 12,
            padding: "8px 10px",
            borderRadius: 4,
          }}
        />
        <input
          type="text"
          value={form.bio}
          onChange={e => setForm(f => ({ ...f, bio: e.target.value.slice(0, 50) }))}
          placeholder="Описание (до 50 символов)"
          maxLength={50}
          className="w-full font-courier focus:outline-none"
          style={{
            background: "#0d0805",
            border: "1px solid #3a2a18",
            color: "#f5e8c8",
            fontSize: 12,
            padding: "8px 10px",
            borderRadius: 4,
          }}
        />
        {error && (
          <div className="font-courier text-[11px]" style={{ color: "#CC6666" }}>{error}</div>
        )}
        <button
          type="submit"
          disabled={creating || !form.username || !form.name}
          className="w-full font-typewriter text-xs"
          style={{
            background: form.username && form.name && !creating
              ? "linear-gradient(135deg, #B8860B, #DAA520)"
              : "#2a1a10",
            color: form.username && form.name && !creating ? "#1a1008" : "#555",
            border: "none",
            borderRadius: 4,
            padding: "10px",
            cursor: creating ? "default" : "pointer",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          {creating ? "..." : "Создать бота"}
        </button>
      </form>

      {/* Existing bots */}
      <div className="font-typewriter tracking-widest uppercase mb-2" style={{ color: "#DAA520", fontSize: 10 }}>
        Мои боты {!loading && `· ${bots.length}`}
      </div>
      {loading && (
        <div className="font-courier text-center py-4" style={{ color: "#5a4020", fontSize: 11 }}>Загрузка...</div>
      )}
      {!loading && bots.length === 0 && (
        <div className="font-courier text-center py-4" style={{ color: "#5a4020", fontSize: 11 }}>Ботов пока нет</div>
      )}
      <div className="space-y-2">
        {bots.map(b => (
          <div
            key={b.id}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(218,165,32,0.18)",
              borderRadius: 6,
              padding: "10px 12px",
            }}
          >
            <div className="font-typewriter" style={{ color: "#f5e8c8", fontSize: 13 }}>
              🤖 {b.name}
            </div>
            <div className="font-courier" style={{ color: "#8a7050", fontSize: 11 }}>
              @{b.username}
            </div>
            {b.bio && (
              <div className="font-typewriter italic" style={{ color: "#8a7050", fontSize: 11, marginTop: 2 }}>
                «{b.bio}»
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleRegenerate(b.id)}
                disabled={busyId === b.id}
                className="font-typewriter text-[10px] px-3 py-1"
                style={{
                  background: "transparent",
                  color: "#DAA520",
                  border: "1px solid rgba(218,165,32,0.4)",
                  borderRadius: 3,
                  cursor: busyId === b.id ? "wait" : "pointer",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Перевыпустить токен
              </button>
              <button
                onClick={() => handleDelete(b.id)}
                disabled={busyId === b.id}
                className="font-typewriter text-[10px] px-3 py-1"
                style={{
                  background: "transparent",
                  color: "#CC6666",
                  border: "1px solid rgba(139,26,26,0.5)",
                  borderRadius: 3,
                  cursor: busyId === b.id ? "wait" : "pointer",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
