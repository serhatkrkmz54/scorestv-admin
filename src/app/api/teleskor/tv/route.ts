import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TvDuzeltme } from "@/lib/types";

/**
 * TV KANALI DÜZELTME — maça elle kanal ekler (motor V118).
 *
 * <p>Gerekçe zorunluluğu ve bütün kurallar motorda. Ekleyen kişi burada
 * gönderilmiyor: ürün backend'i oturumdan alıyor.
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
  const r = await teleskorJson<TvDuzeltme>("/api/v1/admin/engine/tv", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return teleskorResponse(r, "Kanal eklenemedi.");
}
