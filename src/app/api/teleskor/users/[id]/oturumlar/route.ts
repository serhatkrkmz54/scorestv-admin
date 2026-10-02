import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorOturumOzeti } from "@/lib/types";

/**
 * GET /api/v1/admin/users/{id}/oturumlar — üyenin açık oturumları ve
 * bildirim cihazları (üye kartının "Oturumlar ve cihazlar" bölümü).
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await ctx.params;
  const r = await teleskorJson<TeleskorOturumOzeti>(
    `/api/v1/admin/users/${encodeURIComponent(id)}/oturumlar`,
  );
  return teleskorResponse(r, "Oturumlar alınamadı.");
}
