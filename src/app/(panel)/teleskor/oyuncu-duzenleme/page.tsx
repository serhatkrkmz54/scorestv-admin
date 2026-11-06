import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorOyuncuDuzenlemeClient from "@/components/TeleskorOyuncuDuzenlemeClient";

export const dynamic = "force-dynamic";

/**
 * Oyuncu Profili — YALNIZ ADMIN.
 *
 * <p>Zincir: panel → teleskor-backend → sports-engine (motor V119). Oyuncu
 * sayfasının başarılar ve transferler bölümüne elle kayıt eklenir, kaynağın
 * yanlış satırı gizlenir ya da düzeltilir. Kaynağın tablolarına dokunulmuyor;
 * elle satırlar oyuncu sayfası okunurken katılıyor, senkron silmiyor.
 */
export default async function TeleskorOyuncuDuzenlemePage() {
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
          <div style={{ marginTop: 6, fontSize: 13 }}>
            Sunucuda <code>TELESKOR_BACKEND_URL</code> tanımlanmalı.
          </div>
        </div>
      </div>
    );
  }
  return <TeleskorOyuncuDuzenlemeClient />;
}
