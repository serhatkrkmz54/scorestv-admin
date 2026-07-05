"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Newspaper } from "lucide-react";
import { apiLogin, ApiError } from "@/lib/api-client";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiLogin(email.trim(), password, remember);
      // Sunucu tarafı guard, USER'ı zaten reddeder; başarılıysa panele geç.
      router.replace(next);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 403
            ? "Bu panele yalnızca editör ve yöneticiler erişebilir."
            : err.status === 401
              ? "E-posta veya şifre hatalı."
              : err.message,
        );
      } else {
        setError("Giriş yapılamadı. Bağlantınızı kontrol edin.");
      }
      setLoading(false);
    }
  }

  return (
    <form className="login-card" onSubmit={onSubmit}>
      <div className="login-brand">
        <div className="logo">S</div>
        <div>
          <h1>Scores TV</h1>
          <p>Editör Paneli</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label className="label" htmlFor="email">
          E-posta
        </label>
        <input
          id="email"
          type="email"
          className="input"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="password">
          Şifre
        </label>
        <input
          id="password"
          type="password"
          className="input"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <label className="check-row">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        Beni hatırla
      </label>

      <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
        {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
      </button>
    </form>
  );
}
