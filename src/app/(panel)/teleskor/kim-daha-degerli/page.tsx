import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorKddClient from "@/components/TeleskorKddClient";

export const dynamic = "force-dynamic";

/**
 * Kim Daha Değerli? (api-1 V75) — YALNIZ ADMIN: havuzdan oyuncu çıkarma
 * oyunun doğru cevabını etkiler. Ödül ve süre ayarları Uygulama
 * Ayarları'nda ("Kim Daha Değerli?" grubu).
 */
export default async function Sayfa() {
  const user = await resolveUser();
  if (user?.role !== "ADMIN") {
    return (
      <div className="card card-pad">
        <div className="alert alert-error">Bu sayfa yalnız yöneticilere (ADMIN) açıktır.</div>
      </div>
    );
  }
  if (!teleskorConfigured()) {
    return (
      <div className="card card-pad">
        <div className="alert alert-error"><b>Teleskor bağlantısı kurulu değil.</b></div>
      </div>
    );
  }
  return <TeleskorKddClient />;
}
