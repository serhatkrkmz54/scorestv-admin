import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** Oyuncuyu havuza geri koyar. */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ playerId: string }> }) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const { playerId } = await ctx.params;
  if (!/^\d{1,18}$/.test(playerId)) {
    return NextResponse.json({ message: "Geçersiz oyuncu." }, { status: 400 });
  }
  const r = await teleskorJson(`/api/v1/admin/kim-daha-degerli/haric/${playerId}`, { method: "DELETE" });
  return teleskorResponse(r, "Havuza geri konamadı.");
}
