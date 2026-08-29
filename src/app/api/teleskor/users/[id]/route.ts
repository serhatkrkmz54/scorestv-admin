import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorUserDetail } from "@/lib/types";

/** GET /api/v1/admin/users/{id} — tek üyenin tam dökümü. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await ctx.params;
  const r = await teleskorJson<TeleskorUserDetail>(
    `/api/v1/admin/users/${encodeURIComponent(id)}`,
  );
  return teleskorResponse(r, "Üye bilgisi alınamadı.");
}
