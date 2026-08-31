import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorKitleClient from "@/components/TeleskorKitleClient";

export const dynamic = "force-dynamic";

/**
 * Kitle — YALNIZ ADMIN.
 *
 * Rol denetimi burada TEKRAR yapılıyor: Teleskor servis hesabı her zaman
 * ADMIN olduğu için backend'in kendi denetimi bu sayfayı korumaya yetmez
 * (gerekçe: teleskor/market/page.tsx).
 */
export default async function TeleskorKitlePage() {
  const user = await resolveUser();
  if (user?.role !== "ADMIN") {
    return (
      <div className="card card-pad">
        <div className="alert alert-error">
          Bu sayfa yalnız yöneticilere (ADMIN) açıktır.
        </div>
      </div>
    );
  }
  if (!teleskorConfigured()) {
    return (
      <div className="card card-pad">
        <div className="alert alert-error">
          <b>Teleskor bağlantısı kurulu değil.</b>
        </div>
      </div>
    );
  }
  return <TeleskorKitleClient />;
}
