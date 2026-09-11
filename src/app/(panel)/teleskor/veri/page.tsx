import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorVeriClient from "@/components/TeleskorVeriClient";

export const dynamic = "force-dynamic";

/**
 * Veri düzeltme masası — YALNIZ ADMIN.
 *
 * <p>Zincir üç halkalı: panel → teleskor-backend → sports-engine. Motor özel
 * ağda ve bu makineden erişilemiyor, o yüzden ürün backend'i dar bir vekil
 * olarak araya giriyor ({@code MotorYonetimVekili}).
 *
 * <p>Çeviri masası ADI düzeltiyor; bu masa ALANLARI (kapasite, şehir, mevki,
 * doğum tarihi, boy, stadyum bağı…). İkisi ayrı çünkü adın tek kaynağı
 * {@code translation_override}; aynı kavramın iki doğrusu olmasın.
 */
export default async function TeleskorVeriPage() {
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
  return <TeleskorVeriClient />;
}
