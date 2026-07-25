import { resolveUser } from "@/lib/auth-server";
import UsersClient from "@/components/UsersClient";

export const dynamic = "force-dynamic";

/** Üyeler — tüm kullanıcıları listele/ara/yönet. Yalnız ADMIN. */
export default async function UsersPage() {
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
  return <UsersClient meId={user.id} />;
}
