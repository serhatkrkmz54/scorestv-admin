import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorDuyuruClient from "@/components/TeleskorDuyuruClient";

export const dynamic = "force-dynamic";

/**
 * Duyurular — YALNIZ ADMIN.
 *
 * <p>Rol kontrolü BURADA yapılmak zorunda: Teleskor'a giden istek hep
 * aynı servis hesabıyla gidiyor ve o hesap ADMIN — yani Teleskor
 * çağıranın kim olduğunu göremiyor. Kapı bu sayfa.
 *
 * <p>Bu sayfa panelin en yıkıcı düğmesini taşıyor: gönderilen bildirim
 * geri alınamıyor. Editör rolüne kapalı olması bir tercih değil, şart.
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
  return <TeleskorDuyuruClient />;
}
