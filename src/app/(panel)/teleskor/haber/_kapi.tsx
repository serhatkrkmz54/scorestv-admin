import type { ReactNode } from "react";
import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";

/** Teleskor haber sayfalarının ortak kapısı: yalnız ADMIN ve bağlantı kurulu. */
export async function haberKapisi(): Promise<ReactNode | null> {
  const user = await resolveUser();
  if (user?.role !== "ADMIN") {
    return (
      <div className="card card-pad">
        <div className="alert alert-error">Bu sayfa yalnız yöneticilere (ADMIN) açıktır.</div>
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
  return null;
}
