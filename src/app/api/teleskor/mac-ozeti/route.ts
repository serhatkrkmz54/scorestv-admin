import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorMacOzeti } from "@/lib/types";

/**
 * MAÇ ÖZETİ — liste (GET) ve toplu sorgu (POST), Teleskor V55.
 *
 * <h3>Maç listesi BURADAN gelmiyor</h3>
 * Günün maçlarını panel Teleskor'un herkese açık {@code /api/v1/matches}
 * ucundan alıyor ({@code /api/teleskor/mac-ozeti/maclar}); burası yalnız
 * "hangi maçta özet var" sorusunu cevaplıyor ve panel ikisini kendi
 * birleştiriyor. Tek uçta toplansaydı maç verisi iki ayrı yoldan, iki
 * ayrı önbellek davranışıyla dönerdi.
 */

/**
 * TOPLU SORGU — kimlikler GÖVDEDE.
 *
 * <p>İlk sürümde {@code GET ?ids=1,2,3} idi ve üretimde <b>520</b> ile
 * patladı: bir günün maç listesi ~1900 kimlik, yani ~16 KB'lık bir adres.
 * nginx'in varsayılan başlık tamponu 8 KB olduğu için origin isteği
 * reddediyor, Cloudflare 520 yazıyor ve istek Teleskor'a hiç ulaşmıyor.
 * Bu rota da aynı adresi yukarı taşıdığı için sınır iki kez geçerliydi.
 */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  let govde: { ids?: string[] };
  try {
    govde = (await req.json()) as typeof govde;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const ids = Array.isArray(govde.ids) ? govde.ids.map(String) : [];
  if (ids.length === 0) return NextResponse.json({});

  const r = await teleskorJson<Record<string, TeleskorMacOzeti>>(
    "/api/v1/admin/mac-ozeti/toplu",
    { method: "POST", body: JSON.stringify({ ids }) },
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Özet durumları alınamadı.");
}

export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const limit = req.nextUrl.searchParams.get("limit") ?? "50";
  const r = await teleskorJson<TeleskorMacOzeti[]>(
    `/api/v1/admin/mac-ozeti?limit=${encodeURIComponent(limit)}`,
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Özet listesi alınamadı.");
}
