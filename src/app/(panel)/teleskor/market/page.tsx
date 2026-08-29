import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorMarketClient from "@/components/TeleskorMarketClient";

export const dynamic = "force-dynamic";

/**
 * Teleskor Telepuan Marketi — ürünler. YALNIZ ADMIN.
 *
 * <p>Rol kontrolü burada ŞART: Teleskor tarafındaki hizmet hesabı her zaman
 * ADMIN olduğu için o servis "isteği kim attı" diye soramıyor. ScoresTV'nin
 * kendi sayfalarında bu risk yok (orada backend rolü kendisi kontrol
 * ediyor); burada yetkinin tek kapısı panelin kendisi.
 */
export default async function TeleskorMarketPage() {
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
            Sunucuda şu üç değişken tanımlanmalı:{" "}
            <code>TELESKOR_BACKEND_URL</code>,{" "}
            <code>TELESKOR_ADMIN_USER</code>,{" "}
            <code>TELESKOR_ADMIN_PASSWORD</code>. Kullanıcı, Teleskor
            tarafında <b>ADMIN</b> rolüne yükseltilmiş bir hesap olmalı.
          </div>
        </div>
      </div>
    );
  }
  return <TeleskorMarketClient />;
}
