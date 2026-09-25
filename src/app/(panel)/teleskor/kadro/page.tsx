import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorKadroClient from "@/components/TeleskorKadroClient";

export const dynamic = "force-dynamic";

/**
 * Kadro Masası — YALNIZ ADMIN.
 *
 * <p>Zincir üç halkalı: panel → teleskor-backend → sports-engine (motor
 * V105). Takım kadrosunda elle düzeltme: çıkar, taşı, ekle. Kural motorda;
 * sağlayıcının kadro tablosuna dokunulmuyor, düzeltme ayrı tabloda ve kadro
 * okunurken uygulanıyor.
 */
export default async function TeleskorKadroPage() {
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
            Sunucuda <code>TELESKOR_BACKEND_URL</code>,{" "}
            <code>TELESKOR_ADMIN_USER</code> ve{" "}
            <code>TELESKOR_ADMIN_PASSWORD</code> tanımlanmalı.
          </div>
        </div>
      </div>
    );
  }
  return <TeleskorKadroClient />;
}
