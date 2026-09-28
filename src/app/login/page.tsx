import { redirect } from "next/navigation";
import { resolveUser, panelYetkili } from "@/lib/auth-server";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

/**
 * Giriş sayfası — iki kolon: sol görsel (login-bg.jpg + logo), sağ form.
 * Zaten geçerli yönetici oturumu varsa panele yönlendir. Kayıt yok (hesap
 * Teleskor'da açılır, rolü Üyeler ekranından ADMIN yapılır).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const user = await resolveUser();
  if (panelYetkili(user)) {
    redirect("/");
  }

  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/";

  return (
    <div className="login-shell">
      <aside className="login-aside">
        <div className="login-aside-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-light.png" alt="TELE SKOR" />
          <p className="login-aside-tag">Yönetim Paneli</p>
        </div>
      </aside>
      <main className="login-main">
        <LoginForm next={next} />
      </main>
    </div>
  );
}
