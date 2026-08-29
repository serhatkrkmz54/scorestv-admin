import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { CeviriSozlukSatiri } from "@/lib/types";

/**
 * SÖZLÜKLER — aşama adları, sakatlık sebepleri, puan durumu bölgeleri.
 *
 * <p>Bu üç ad türünü sağlayıcı hiç çevirmiyor (dil ucu onları kapsamıyor),
 * yani tek Türkçe kaynağı elle giriş. Motor listeye <b>veride geçen ama
 * sözlükte olmayan</b> adları da katıyor: "neyi çevirmem gerekiyor"
 * sorusunun cevabı o satırlar.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ ad: string }> },
) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { ad } = await ctx.params;
  const r = await teleskorJson<CeviriSozlukSatiri[]>(
    `/api/v1/admin/engine/ceviri/sozluk/${encodeURIComponent(ad)}`,
  );
  return teleskorResponse(r, "Sözlük alınamadı.");
}

/** Boş {@code adTr} satırı sözlükten SİLER (ad İngilizce'ye döner). */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ ad: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { ad } = await ctx.params;
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await teleskorJson(
    `/api/v1/admin/engine/ceviri/sozluk/${encodeURIComponent(ad)}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  return teleskorResponse(r, "Sözlük satırı kaydedilemedi.");
}
