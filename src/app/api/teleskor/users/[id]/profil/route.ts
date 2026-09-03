import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorUserProfil } from "@/lib/types";

/**
 * GET /api/v1/admin/users/{id}/profil — üyenin profil dökümü.
 *
 * Favoriler, sevmediği takımlar ve profil sayıları. Hesap bilgisinden
 * (`.../users/{id}`) AYRI uçta çünkü favori adları Teleskor motorundan
 * çözülüyor: motor kapalıyken bu bölüm eksik gelse bile hesabın durumu,
 * rolü ve düğmeleri çalışmaya devam etmeli.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await ctx.params;
  const r = await teleskorJson<TeleskorUserProfil>(
    `/api/v1/admin/users/${encodeURIComponent(id)}/profil`,
  );
  return teleskorResponse(r, "Profil bilgisi alınamadı.");
}
