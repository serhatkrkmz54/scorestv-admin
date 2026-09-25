import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { KadroDuzeltme } from "@/lib/types";

/**
 * KADRO MASASI — düzeltme yazar (CIKAR / EKLE).
 *
 * <p>Gerekçe zorunluluğu ve bütün kurallar motorda. Yazan kişi burada
 * gönderilmiyor: ürün backend'i oturumdan alıyor. {@code ekTakim} yalnız
 * önbellek ipucu (taşımada eski takımın sayfası da tazelensin).
 */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const ekTakim = req.nextUrl.searchParams.get("ekTakim");
  const ek = ekTakim && /^\d+$/.test(ekTakim) ? `?ekTakim=${ekTakim}` : "";

  const r = await teleskorJson<KadroDuzeltme>(`/api/v1/admin/engine/kadro${ek}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return teleskorResponse(r, "Düzeltme kaydedilemedi.");
}
