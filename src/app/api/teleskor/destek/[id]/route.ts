import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorDestekYazismasi } from "@/lib/types";

/** Talebin yazışması. Açmak yöneticinin okundu damgasını atıyor. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await ctx.params;
  const r = await teleskorJson<TeleskorDestekYazismasi>(
    `/api/v1/admin/destek/${encodeURIComponent(id)}`,
  );
  return teleskorResponse(r, "Yazışma alınamadı.");
}
