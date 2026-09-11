import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { VeriStadyumu } from "@/lib/types";

/**
 * Stadyum seçici — `TEAM.venue_id` gibi `referans` alanların kutusu.
 *
 * İki kip:
 *  - `?q=`   arama (en az 2 harf),
 *  - `?ids=` alanın ŞU ANKİ değerinin adını çözmek için.
 *
 * Zincir: panel → teleskor-backend → sports-engine.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").trim();

  // Kimlik listesi biçimi burada da denetleniyor: motor sayı olmayanı zaten
  // atlıyor, ama bozuk bir değeri ağ üzerinden taşımanın anlamı yok.
  if (ids && !/^\d+(,\d+)*$/.test(ids)) {
    return NextResponse.json({ message: "Geçersiz kimlik listesi." }, { status: 400 });
  }
  // Boş sorgu motora hiç gitmiyor: cevabı zaten boş liste.
  if (!ids && q.length < 2) {
    return NextResponse.json([]);
  }

  const r = await teleskorJson<VeriStadyumu[]>(
    `/api/v1/admin/engine/veri/stadyumlar?q=${encodeURIComponent(q)}&ids=${encodeURIComponent(ids)}`,
  );
  return teleskorResponse(r, "Stadyum listesi alınamadı.");
}
