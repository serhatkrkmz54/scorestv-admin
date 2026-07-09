"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiLogin, ApiError } from "@/lib/api-client";

// Son BAŞARILI e-postayı tarayıcıda hatırlar → "Tekrar hoş geldin" kartı.
// Yalnız e-posta saklanır; ŞİFRE asla saklanmaz.
const LAST_EMAIL_KEY = "stv_admin_last_email";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Hatırlanan hesap (varsa) → "Tekrar hoş geldin" görünümü.
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_EMAIL_KEY);
      if (saved) {
        setRememberedEmail(saved);
        setEmail(saved);
        setReturning(true);
      }
    } catch {
      /* localStorage kapalı/erişilemez olabilir — sorun değil */
    }
  }, []);

  function forgetAccount() {
    try {
      localStorage.removeItem(LAST_EMAIL_KEY);
    } catch {
      /* yok say */
    }
    setRememberedEmail(null);
    setReturning(false);
    setEmail("");
    setPassword("");
  }

  function useDifferent() {
    setReturning(false);
    setEmail("");
    setPassword("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiLogin(email.trim(), password, remember);
      // Bir dahaki girişte "Tekrar hoş geldin" göstermek için e-postayı sakla.
      try {
        localStorage.setItem(LAST_EMAIL_KEY, email.trim());
      } catch {
        /* yok say */
      }
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

  const showWelcome = returning && !!rememberedEmail;

  return (
    <form className="login-card" onSubmit={onSubmit}>
      <div className="login-head">
        <h1>{showWelcome ? "Tekrar hoş geldin" : "Giriş Yap"}</h1>
        <p>
          {showWelcome
            ? "Devam etmek için şifreni gir."
            : "Editör paneline erişmek için giriş yap."}
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showWelcome ? (
        <div className="login-welcome">
          <div className="login-welcome-avatar">
            {rememberedEmail!.charAt(0).toUpperCase()}
          </div>
          <div className="login-welcome-info">
            <div className="lbl">Hoş geldin,</div>
            <div className="eml">{rememberedEmail}</div>
          </div>
          <button
            type="button"
            className="login-welcome-remove"
            onClick={forgetAccount}
          >
            Kaldır
          </button>
        </div>
      ) : (
        <div className="login-field">
          <label className="label" htmlFor="email">
            E-posta
          </label>
          <div className="login-input">
            <MailIcon />
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
        </div>
      )}

      <div className="login-field">
        <label className="label" htmlFor="password">
          Şifre
        </label>
        <div className="login-input">
          <LockIcon />
          <input
            id="password"
            type="password"
            className="input"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus={showWelcome}
          />
        </div>
      </div>

      <div className="login-row">
        <label className="check-row">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Beni hatırla
        </label>
      </div>

      <button className="btn btn-primary login-submit" disabled={loading}>
        {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        <span aria-hidden>→</span>
      </button>

      {showWelcome && (
        <div className="login-switch">
          <button type="button" className="login-link" onClick={useDifferent}>
            Farklı bir hesapla giriş yap
          </button>
        </div>
      )}
    </form>
  );
}

function MailIcon() {
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
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
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
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
