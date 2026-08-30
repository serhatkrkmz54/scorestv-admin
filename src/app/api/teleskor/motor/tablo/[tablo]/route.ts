import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** Beyaz listedeki bir tablodan örnek kayıtlar. Liste MOTORDA. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ tablo: string }> },
) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { tablo } = await ctx.params;
  const r = await teleskorJson(
    `/api/v1/admin/engine/motor/tablo/${encodeURIComponent(tablo)}`,
  );
  return teleskorResponse(r, "Tablo okunamadı.");
}
