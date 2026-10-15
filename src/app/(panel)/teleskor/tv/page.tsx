import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorTvClient from "@/components/TeleskorTvClient";

export const dynamic = "force-dynamic";

/**
 * TV Kanalı Düzeltme — YALNIZ ADMIN.
 *
 * <p>Zincir üç halkalı: panel → teleskor-backend → sports-engine (motor
 * V118). Sağlayıcının vermediği TV kanalını maça elle ekler; kural motorda,
 * sağlayıcının TV tablosuna dokunulmuyor, kanal ayrı tabloda ve maç TV'si ile
 * TV rehberi okunurken katılıyor.
 */
export default async function TeleskorTvPage() {
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
  return <TeleskorTvClient />;
}
