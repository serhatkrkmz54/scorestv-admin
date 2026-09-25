import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { KadroDuzeltme } from "@/lib/types";

/** KADRO MASASI — düzeltmeyi geri alır (satır silinmez, kapanır). */
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
    return NextResponse.json({ message: "Geçersiz düzeltme." }, { status: 400 });
  }
  const ekTakim = req.nextUrl.searchParams.get("ekTakim");
  const ek = ekTakim && /^\d+$/.test(ekTakim) ? `?ekTakim=${ekTakim}` : "";
  const r = await teleskorJson<KadroDuzeltme>(
    `/api/v1/admin/engine/kadro/${id}${ek}`,
    { method: "DELETE" },
  );
  return teleskorResponse(r, "Düzeltme geri alınamadı.");
}
