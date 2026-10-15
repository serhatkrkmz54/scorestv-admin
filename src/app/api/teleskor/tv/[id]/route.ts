import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TvDuzeltme } from "@/lib/types";

/** TV KANALI DÜZELTME — elle eklenen kanalı kaldırır (satır silinmez, damgalanır). */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ message: "Geçersiz kayıt." }, { status: 400 });
  }
  const r = await teleskorJson<TvDuzeltme>(`/api/v1/admin/engine/tv/${id}`, {
    method: "DELETE",
  });
  return teleskorResponse(r, "Kanal kaldırılamadı.");
}
