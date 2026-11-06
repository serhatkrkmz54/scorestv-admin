import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** OYUNCU DÜZENLEME — turnuvanın motordaki sezonları. */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const lig = req.nextUrl.searchParams.get("lig") ?? "";
  if (!/^\d+$/.test(lig)) return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  const r = await teleskorJson<unknown>(`/api/v1/admin/engine/oyuncu-duzeltme/lig-sezonlari?lig=${lig}`);
  return teleskorResponse(r, "Sezonlar alınamadı.");
}
