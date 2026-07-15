import { resolveUser } from "@/lib/auth-server";
import GameCoinsClient from "@/components/GameCoinsClient";

export const dynamic = "force-dynamic";

/** Scores Coin yönetimi — üye ara, coin ekle/çıkar. Yalnız ADMIN. */
export default async function GameCoinsPage() {
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
  return <GameCoinsClient />;
}
