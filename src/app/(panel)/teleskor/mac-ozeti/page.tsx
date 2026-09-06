import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorMacOzetiClient from "@/components/TeleskorMacOzetiClient";

export const dynamic = "force-dynamic";

/**
 * MAÇ ÖZETİ — maç sonrası video (Teleskor V55).
 *
 * <p>Rol kontrolü BURADA yapılmak zorunda: Teleskor'a giden istek hep
 * aynı servis hesabıyla gidiyor ve o hesap ADMIN — yani Teleskor
 * çağıranın kim olduğunu göremiyor. Kapı bu sayfa.
 *
 * <p>Buradan eklenen video kullanıcının maç detayında bir sekme olarak
 * çıkıyor; yanlış bir bağlantı doğrudan uygulamanın ekranına düşer.
 * Editör rolüne kapalı olması bir tercih değil, şart.
 */
export default async function TeleskorMacOzetiPage() {
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
  return <TeleskorMacOzetiClient />;
}
