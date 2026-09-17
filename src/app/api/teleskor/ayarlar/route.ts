import { NextResponse } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { UygulamaAyari } from "@/lib/types";

/**
 * UYGULAMA AYARLARI — api-1'in `uygulama_ayari` kataloğu (V67).
 *
 * <p>Her satır: anahtar, tür (BOOL/INT/TEXT), grup, etiket, açıklama, o
 * anki değer, varsayılan (.env), kaynak (PANEL/VARSAYILAN). Değişiklik
 * anında bütün uygulama sürümlerini etkiler.
 */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const r = await teleskorJson<UygulamaAyari[]>("/api/v1/admin/uygulama-ayarlari");
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Ayarlar okunamadı.");
}
