import { redirect } from "next/navigation";
import { resolveUser, isEditorOrAdmin } from "@/lib/auth-server";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

/**
 * Giriş sayfası — iki kolon: sol görsel (login-bg.jpg + logo), sağ form.
 * Zaten geçerli EDITOR/ADMIN oturumu varsa panele yönlendir. Kayıt (signup) yok.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const user = await resolveUser();
  if (isEditorOrAdmin(user)) {
    redirect("/");
  }

  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/";

  return (
    <div className="login-shell">
      <aside className="login-aside">
        <div className="login-aside-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-light.png" alt="Scores TV" />
          <p className="login-aside-tag">Editör Paneli</p>
        </div>
      </aside>
      <main className="login-main">
        <LoginForm next={next} />
      </main>
    </div>
  );
}
