import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorMarketClient from "@/components/TeleskorMarketClient";

export const dynamic = "force-dynamic";

/**
 * Teleskor Telepuan Marketi — ürünler. YALNIZ ADMIN.
 *
 * <p>Asıl yetki Teleskor'da (yöneticinin kendi oturumu, `hasRole('ADMIN')`);
 * buradaki kontrol yalnız anlaşılır bir mesaj için.
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
            <code>TELESKOR_BACKEND_URL</code> tanımlanmalı.. Kullanıcı, Teleskor
            tarafında <b>ADMIN</b> rolüne yükseltilmiş bir hesap olmalı.
          </div>
        </div>
      </div>
    );
  }
  return <TeleskorMarketClient />;
}
