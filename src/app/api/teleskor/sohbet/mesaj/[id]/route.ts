import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * Mesajı sil — üstündeki BÜTÜN bekleyen şikayetler kapanır.
 *
 * <p>Satır gerçekten silinmiyor, {@code deleted_at} işaretleniyor:
 * şikayetin işaret ettiği içerik kanıt olarak durmalı.
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
    `/api/v1/admin/chat/messages/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (r.ok) return NextResponse.json({ ok: true });
  return teleskorResponse(r, "Mesaj silinemedi.");
}
