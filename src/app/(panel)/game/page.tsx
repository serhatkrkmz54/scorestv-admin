import { resolveUser } from "@/lib/auth-server";
import GameClient from "@/components/GameClient";

export const dynamic = "force-dynamic";

/** Oyun (Scores Coin) yönetimi — yalnız ADMIN (backend de hasRole('ADMIN')). */
export default async function GamePage() {
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
  return <GameClient />;
}
