import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorUsersClient from "@/components/TeleskorUsersClient";

export const dynamic = "force-dynamic";

/** Teleskor üye yönetimi — YALNIZ ADMIN (gerekçe: teleskor/market/page.tsx). */
export default async function TeleskorUsersPage() {
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
  return <TeleskorUsersClient />;
}
