import { resolveUser } from "@/lib/auth-server";
import ContactClient from "@/components/ContactClient";

export const dynamic = "force-dynamic";

/** İletişim mesajları — yalnız ADMIN (backend de hasRole('ADMIN') ister). */
export default async function MessagesPage() {
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
  return <ContactClient />;
}
