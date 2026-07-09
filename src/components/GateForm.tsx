"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Erişim kapısı formu — anahtarı /api/gate'e gönderir. Anahtar sunucuda
 * doğrulanır; doğruysa httpOnly çerez yazılır ve [next]'e geçilir.
 */
export default function GateForm({ next }: { next: string }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        router.replace(next);
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setError(
        res.status === 429
          ? "Çok fazla deneme. Lütfen biraz sonra tekrar dene."
          : (data.message ?? "Anahtar hatalı."),
      );
    } catch {
      setError("Doğrulanamadı. Bağlantını kontrol et.");
    }
    setLoading(false);
  }

  return (
    <form className="login-card" onSubmit={onSubmit}>
      <div className="login-head">
        <h1>Erişim Anahtarı</h1>
        <p>Devam etmek için panel erişim anahtarını gir.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="login-field">
        <label className="label" htmlFor="gatekey">
          Anahtar
        </label>
        <div className="login-input">
          <KeyIcon />
          <input
            id="gatekey"
            type="password"
            className="input"
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
            autoFocus
          />
        </div>
      </div>

      <button className="btn btn-primary login-submit" disabled={loading}>
        {loading ? "Doğrulanıyor..." : "Devam Et"}
        <span aria-hidden>→</span>
      </button>
    </form>
  );
}

function KeyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}
