import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorAkisClient from "@/components/TeleskorAkisClient";

export const dynamic = "force-dynamic";

/** Akış moderasyonu — YALNIZ ADMIN (gerekçe: teleskor/market/page.tsx). */
export default async function TeleskorAkisPage() {
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
  return <TeleskorAkisClient />;
}
