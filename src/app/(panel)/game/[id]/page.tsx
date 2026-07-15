import { resolveUser } from "@/lib/auth-server";
import GameCompetitionClient from "@/components/GameCompetitionClient";

export const dynamic = "force-dynamic";

/** Yarışma detay + düello yönetimi — yalnız ADMIN. */
export default async function GameCompetitionPage(
  ctx: { params: Promise<{ id: string }> },
) {
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
  const { id } = await ctx.params;
  return <GameCompetitionClient competitionId={Number(id)} />;
}
