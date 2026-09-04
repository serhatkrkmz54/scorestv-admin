import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { DuyuruOnizleme } from "@/lib/types";

/**
 * "Bu duyuru kaç kişiye gider?"
 *
 * <p>Gönder düğmesine basmadan önce sorulabilen tek soru. Ticari iletide
 * kesin sayı dönüyor (rıza verenler); hizmet duyurusunda sayı BİLİNMİYOR
 * ve tahmin edilmiyor — FCM konuya kaç cihazın abone olduğunu söylemiyor.
 *
 * <p>Yanıt ayrıca bildirim servisinin açık olup olmadığını söylüyor:
 * kapalıysa gönderim ucu 503 dönecek ve panel düğmeyi baştan kapatıyor.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const tur = req.nextUrl.searchParams.get("tur") ?? "DUYURU";
  const r = await teleskorJson<DuyuruOnizleme>(
    `/api/v1/admin/duyuru/onizleme?tur=${encodeURIComponent(tur)}`,
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Önizleme alınamadı.");
}
