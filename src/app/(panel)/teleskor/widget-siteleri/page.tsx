import { resolveUser } from "@/lib/auth-server";
import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorWidgetSiteleriClient from "@/components/TeleskorWidgetSiteleriClient";

export const dynamic = "force-dynamic";

/** Widget siteleri — YALNIZ ADMIN (anahtar ve gömme izni burada veriliyor). */
export default async function TeleskorWidgetSiteleriPage() {
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
        </div>
      </div>
    );
  }
  return <TeleskorWidgetSiteleriClient />;
}
