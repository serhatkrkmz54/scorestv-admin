import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorSozlesmeClient from "@/components/TeleskorSozlesmeClient";

export const dynamic = "force-dynamic";

/**
 * Sözleşme metinleri — YALNIZ ADMIN (gerekçe: teleskor/market/page.tsx).
 *
 * <p>Rol kontrolü BURADA yapılmak zorunda: Teleskor'a giden istek hep
 * aynı servis hesabıyla gidiyor ve o hesap ADMIN — yani Teleskor artık
 * çağıranın kim olduğunu göremiyor. Kapı bu sayfa.
 */
export default async function TeleskorPage() {
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
  return <TeleskorSozlesmeClient />;
}
