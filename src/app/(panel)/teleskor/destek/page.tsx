import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorDestekClient from "@/components/TeleskorDestekClient";

export const dynamic = "force-dynamic";

/**
 * DESTEK — uygulamadaki "Bize Ulaşın" yazışması (YALNIZ ADMIN).
 *
 * Teleskor mesajları artık ScoresTV'nin "Mesajlar" sayfasına düşmüyor:
 * yazışma teleskor-backend'de ve buradan yazılan cevabı kullanıcı
 * UYGULAMADAN okuyor (Serhat'ın kararı, 3 Eylül).
 */
export default async function TeleskorDestekPage() {
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
  return <TeleskorDestekClient />;
}
