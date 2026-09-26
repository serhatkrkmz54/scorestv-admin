import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * Oyuncu fotoğrafı / takım logosu yükle (motor V106). Gövde JSON:
 * `{ tur, id, dosya (Base64 data URL), gerekce }`. Motor dosyayı görsel
 * hattından geçirir (küçültme, SVG -> PNG) ve yamayı yazar.
 *
 * Tavan: ürün backend'inin önündeki nginx 6 MB gövde kabul ediyor; Base64
 * dosyayı ~1,33 kat büyüttüğü için dosya 4 MB ile sınırlı (istemci de
 * göndermeden denetliyor).
 */
const AZAMI_GOVDE = 6 * 1024 * 1024 - 64 * 1024;

export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const metin = await req.text();
  if (metin.length > AZAMI_GOVDE) {
    return NextResponse.json({ message: "Dosya çok büyük (en fazla 4 MB)." }, { status: 413 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(metin);
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const takim = req.nextUrl.searchParams.get("takim");
  const ek = takim && /^\d{1,12}$/.test(takim) ? `?takim=${takim}` : "";
  const r = await teleskorJson(`/api/v1/admin/engine/veri/gorsel${ek}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return teleskorResponse(r, "Görsel yüklenemedi.");
}
