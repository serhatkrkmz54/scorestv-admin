import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorModerasyonOzeti } from "@/lib/types";

/** GET /api/v1/admin/users/{id}/moderasyon — üye kartının moderasyon ve içerik özeti. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await ctx.params;
  const r = await teleskorJson<TeleskorModerasyonOzeti>(
    `/api/v1/admin/users/${encodeURIComponent(id)}/moderasyon`,
  );
  return teleskorResponse(r, "Moderasyon özeti alınamadı.");
}
