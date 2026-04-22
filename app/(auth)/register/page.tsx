"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generateKeyPair, encryptPrivateKey, b64encode } from "@/lib/crypto";

const TIMEZONES = [
  "UTC-12", "UTC-11", "UTC-10", "UTC-9", "UTC-8", "UTC-7", "UTC-6",
  "UTC-5", "UTC-4", "UTC-3", "UTC-2", "UTC-1", "UTC+0",
  "UTC+1", "UTC+2", "UTC+3", "UTC+4", "UTC+5", "UTC+6",
  "UTC+7", "UTC+8", "UTC+9", "UTC+10", "UTC+11", "UTC+12",
];

// Detect user's timezone from the browser. Falls back to UTC+0.
function detectTimezone(): string {
  try {
    const offsetMin = -new Date().getTimezoneOffset();
    const hours = Math.round(offsetMin / 60);
    const sign = hours >= 0 ? "+" : "-";
    return `UTC${sign}${Math.abs(hours)}`;
  } catch {
    return "UTC+0";
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", name: "", phone: "", password: "", timezone: detectTimezone() });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const keyPair = generateKeyPair();
      const { encryptedPrivateKey, privateKeyNonce, privateKeySalt } =
        await encryptPrivateKey(keyPair.secretKey, form.password);
      const payload = {
        ...form,
        publicKey: b64encode(keyPair.publicKey),
        encryptedPrivateKey,
        privateKeyNonce,
        privateKeySalt,
      };
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ошибка регистрации");
        setLoading(false);
        return;
      }
      router.push("/login");
    } catch {
      setError("Ошибка соединения");
      setLoading(false);
    }
  }

  const fields = [
    { key: "username", label: "Юзернейм", type: "text", placeholder: "ivan_petrov", hint: "3–30 символов, латиница, цифры, _" },
    { key: "name", label: "Имя", type: "text", placeholder: "Иван Иванов", hint: "" },
    { key: "phone", label: "Номер телефона", type: "text", placeholder: "+77777777777", hint: "" },
    { key: "password", label: "Пароль", type: "password", placeholder: "", hint: "" },
  ];

  return (
    <div className="min-h-screen desk-surface flex items-center justify-center p-4 py-8">
      <div
        className="relative bg-[#1a1008] rounded-lg p-6 sm:p-8 w-full max-w-sm desk-shadow"
        style={{ border: "3px solid #3a2a18" }}
      >
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-typewriter tracking-widest"
          style={{ background: "linear-gradient(135deg, #B8860B, #DAA520, #B8860B)", color: "#1a1008", borderRadius: "3px" }}
        >
          RZTelegramaXYZ
        </div>

        <h1 className="text-center font-typewriter text-[var(--paper-aged)] text-xl mb-6 mt-2 tracking-widest uppercase">
          Регистрация
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(({ key, label, type, placeholder, hint }) => (
            <div key={key}>
              <label className="block text-xs font-typewriter text-[#9a8870] tracking-wider mb-1 uppercase">
                {label}
              </label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => update(key, e.target.value)}
                placeholder={placeholder}
                autoComplete={key === "password" ? "new-password" : key === "username" ? "username" : "off"}
                className="w-full bg-[#0d0805] border border-[#3a2a18] text-[var(--paper-aged)] font-courier px-3 py-2 rounded focus:outline-none focus:border-[#DAA520] transition-colors"
              />
              {hint && (
                <p className="text-[#666] text-[10px] font-typewriter mt-1">{hint}</p>
              )}
            </div>
          ))}

          <div>
            <label className="block text-xs font-typewriter text-[#9a8870] tracking-wider mb-1 uppercase">
              Часовой пояс
            </label>
            <select
              value={form.timezone}
              onChange={(e) => update("timezone", e.target.value)}
              className="w-full bg-[#0d0805] border border-[#3a2a18] text-[var(--paper-aged)] font-courier px-3 py-2 rounded focus:outline-none focus:border-[#DAA520] transition-colors"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            <p className="text-[#666] text-[10px] font-typewriter mt-1">
              Линия связи назначается случайно.
            </p>
          </div>

          {error && (
            <p className="text-[var(--lamp-red)] text-xs font-typewriter text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 font-typewriter tracking-widest uppercase text-sm"
            style={{
              background: loading ? "#3a2a18" : "linear-gradient(135deg, #B8860B, #DAA520, #B8860B)",
              color: "#1a1008",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>

        <p className="text-center text-xs text-[#9a8870] mt-4 font-typewriter">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-[#DAA520] hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
