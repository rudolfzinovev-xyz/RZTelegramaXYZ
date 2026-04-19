"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generateKeyPair, encryptPrivateKey, b64encode, decryptPrivateKey, storePrivateKey } from "@/lib/crypto";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Соединение...");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    if (result?.error) {
      setError("Неверный юзернейм или пароль");
      setLoading(false);
      return;
    }

    try {
      const keyRes = await fetch("/api/me/keys");
      if (!keyRes.ok) throw new Error("keys fetch");
      const keys = await keyRes.json();
      let privateKey: Uint8Array | null = null;

      if (!keys.encryptedPrivateKey || !keys.privateKeyNonce || !keys.privateKeySalt) {
        // Old account without keys — generate new keypair automatically
        setLoadingMsg("Генерация ключей...");
        const kp = generateKeyPair();
        const blob = await encryptPrivateKey(kp.secretKey, password);
        const putRes = await fetch("/api/me/keys", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, publicKey: b64encode(kp.publicKey), ...blob }),
        });
        if (!putRes.ok) {
          setError("Ошибка генерации ключей");
          setLoading(false);
          return;
        }
        privateKey = kp.secretKey;
      } else {
        privateKey = await decryptPrivateKey(
          keys.encryptedPrivateKey,
          keys.privateKeyNonce,
          keys.privateKeySalt,
          password,
        );
        if (!privateKey) {
          setError("Ошибка расшифровки ключа");
          setLoading(false);
          return;
        }
      }
      storePrivateKey(privateKey);
    } catch {
      setError("Ошибка загрузки ключей");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/desk");
  }

  return (
    <div className="min-h-screen desk-surface flex items-center justify-center">
      <div
        className="relative bg-[#1a1008] rounded-lg p-8 w-96 desk-shadow"
        style={{ border: "3px solid #3a2a18" }}
      >
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-typewriter tracking-widest"
          style={{ background: "linear-gradient(135deg, #B8860B, #DAA520, #B8860B)", color: "#1a1008", borderRadius: "3px" }}
        >
          RZTelegramaXYZ
        </div>

        <h1 className="text-center font-typewriter text-[var(--paper-aged)] text-xl mb-6 mt-2 tracking-widest uppercase">
          Войти в систему
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-typewriter text-[#9a8870] tracking-wider mb-1 uppercase">
              Юзернейм
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ivan_petrov"
              autoComplete="username"
              className="w-full bg-[#0d0805] border border-[#3a2a18] text-[var(--paper-aged)] font-courier px-3 py-2 rounded focus:outline-none focus:border-[#DAA520] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-typewriter text-[#9a8870] tracking-wider mb-1 uppercase">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-[#0d0805] border border-[#3a2a18] text-[var(--paper-aged)] font-courier px-3 py-2 rounded focus:outline-none focus:border-[#DAA520] transition-colors"
            />
          </div>

          {error && (
            <p className="text-[var(--lamp-red)] text-xs font-typewriter text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 font-typewriter tracking-widest uppercase text-sm transition-all"
            style={{
              background: loading ? "#3a2a18" : "linear-gradient(135deg, #B8860B, #DAA520, #B8860B)",
              color: "#1a1008",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? loadingMsg : "Войти"}
          </button>
        </form>

        <p className="text-center text-xs text-[#9a8870] mt-4 font-typewriter">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-[#DAA520] hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
