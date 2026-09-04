import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorSurumNotuClient from "@/components/TeleskorSurumNotuClient";

export const dynamic = "force-dynamic";

/**
 * Sürüm notları — YALNIZ ADMIN.
 *
 * <p>Rol kontrolü BURADA yapılmak zorunda: Teleskor'a giden istek hep
 * aynı servis hesabıyla gidiyor ve o hesap ADMIN — yani Teleskor
 * çağıranın kim olduğunu göremiyor. Kapı bu sayfa.
 */
export default async function TeleskorSurumNotuPage() {
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
  return <TeleskorSurumNotuClient />;
}
