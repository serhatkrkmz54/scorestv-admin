import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorSiteHaritasi, teleskorResponse } from "@/lib/teleskor-guard";
import type { SayfaMetaListesi } from "@/lib/types";

/** Elle başlık/açıklama verilen sayfalar (en son değişen önce, 50'şer; `q` yolda ve başlıkta arar). */
export async function GET(req: NextRequest) {
  const izin = await teleskorSiteHaritasi();
  if ("error" in izin) return izin.error;
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 200);
  const sayfa = Math.max(0, Number.parseInt(req.nextUrl.searchParams.get("sayfa") ?? "0", 10) || 0);
  const r = await teleskorJson<SayfaMetaListesi>(
    `/api/v1/admin/site-haritasi/sayfalar?q=${encodeURIComponent(q)}&sayfa=${sayfa}`,
  );
  return teleskorResponse(r, "Liste alınamadı.");
}

/** Sayfanın başlığını/açıklamasını yazar (aynı yol tek kayıt; boş alan = sitenin kendi değeri). */
export async function PUT(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorSiteHaritasi();
  if ("error" in izin) return izin.error;
  let p: { yol?: string; baslik?: string; aciklama?: string; not?: string };
  try {
    p = (await req.json()) as typeof p;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const r = await teleskorJson<SayfaMetaListesi>("/api/v1/admin/site-haritasi/sayfalar", {
    method: "PUT",
    body: JSON.stringify({ yol: p.yol ?? "", baslik: p.baslik ?? null, aciklama: p.aciklama ?? null, not: p.not ?? null }),
  });
  return teleskorResponse(r, "Kaydedilemedi.");
}
