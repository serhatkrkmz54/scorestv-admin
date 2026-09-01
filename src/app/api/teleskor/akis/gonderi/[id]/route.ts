import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * Gönderiyi sil — üstündeki BÜTÜN bekleyen şikayetler kapanır.
 *
 * <p>Yorumlarına açılmış şikayetler de kapanıyor: gönderi gidince
 * yorumları da görünmez oluyor.
 *
 * <p>Satır gerçekten silinmiyor ({@code deleted_at}): şikayetin işaret
 * ettiği içerik kanıt olarak durmalı. Gönderi ayrıca ödül DAĞITIMINDAN
 * da düşüyor — ama TUTMADI değil IPTAL yazılıyor.
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await ctx.params;
  const r = await teleskorJson(
    `/api/v1/admin/akis/gonderiler/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (r.ok) return NextResponse.json({ ok: true });
  return teleskorResponse(r, "Gönderi silinemedi.");
}
