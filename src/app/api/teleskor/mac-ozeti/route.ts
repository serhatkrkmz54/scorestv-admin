import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorMacOzeti } from "@/lib/types";

/**
 * MAÇ ÖZETİ — liste ve toplu sorgu (Teleskor V55).
 *
 * <h3>Maç listesi BURADAN gelmiyor</h3>
 * Günün maçlarını panel Teleskor'un herkese açık {@code /api/v1/matches}
 * ucundan alıyor ({@code /api/teleskor/mac-ozeti/maclar}); burası yalnız
 * "hangi maçta özet var" sorusunu cevaplıyor ve panel ikisini kendi
 * birleştiriyor. Tek uçta toplansaydı maç verisi iki ayrı yoldan, iki
 * ayrı önbellek davranışıyla dönerdi.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const ids = req.nextUrl.searchParams.get("ids");
  if (ids) {
    // TOPLU: gün ekranı. Maç başına ayrı istek 600 maçlık bir cumarteside
    // 600 istek ederdi.
    const r = await teleskorJson<Record<string, TeleskorMacOzeti>>(
      `/api/v1/admin/mac-ozeti/toplu?ids=${encodeURIComponent(ids)}`,
    );
    if (r.ok) return NextResponse.json(r.body);
    return teleskorResponse(r, "Özet durumları alınamadı.");
  }

  const limit = req.nextUrl.searchParams.get("limit") ?? "50";
  const r = await teleskorJson<TeleskorMacOzeti[]>(
    `/api/v1/admin/mac-ozeti?limit=${encodeURIComponent(limit)}`,
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Özet listesi alınamadı.");
}
