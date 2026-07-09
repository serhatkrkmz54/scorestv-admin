import GateForm from "@/components/GateForm";

export const dynamic = "force-dynamic";

/**
 * Erişim kapısı ekranı — panelin (login dahil) önündeki paylaşımlı anahtar.
 * Middleware, kapı çerezi yoksa buraya yönlendirir. Kapı env ile aktifleşir;
 * env yoksa middleware /gate'i doğrudan /login'e çevirir.
 */
export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next =
    typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/";

  return (
    <div className="login-shell">
      <aside className="login-aside">
        <div className="login-aside-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-light.png" alt="ScoresTV" />
          <p className="login-aside-tag">Editör Paneli</p>
        </div>
      </aside>
      <main className="login-main">
        <GateForm next={next} />
      </main>
    </div>
  );
}
