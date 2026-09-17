import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorAyarlarClient from "@/components/TeleskorAyarlarClient";

export const dynamic = "force-dynamic";

/**
 * Uygulama ayarları — YALNIZ ADMIN.
 *
 * <p>Buradaki anahtarlar mağazadaki bütün sürümleri ANINDA etkiliyor;
 * editör rolüne kapalı olması tercih değil, şart. Rol kontrolü burada:
 * Teleskor'a giden istek hep aynı servis hesabıyla gidiyor.
 */
export default async function TeleskorAyarlarPage() {
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
  return <TeleskorAyarlarClient />;
}
