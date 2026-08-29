import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorCeviriClient from "@/components/TeleskorCeviriClient";

export const dynamic = "force-dynamic";

/**
 * Çeviri düzeltme masası — YALNIZ ADMIN (gerekçe: teleskor/market/page.tsx).
 *
 * <p>Zincir üç halkalı: panel → teleskor-backend → sports-engine. Motor
 * özel ağda ve bu makineden erişilemiyor, o yüzden ürün backend'i dar bir
 * vekil olarak araya giriyor ({@code MotorCeviriVekili}).
 */
export default async function TeleskorCeviriPage() {
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
  return <TeleskorCeviriClient />;
}
