import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { KadroTakimBulgusu } from "@/lib/types";

/**
 * KADRO MASASI — oyuncuyu taşımak için hedef takım araması.
 *
 * <p>Ürünün herkese açık katalog araması kullanılıyor (aynı sonuçları
 * uygulama da görüyor); yeni bir yönetim ucu açmaya gerek yok.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ adet: 0, sonuclar: [] });
  const r = await teleskorJson<{ adet: number; sonuclar: KadroTakimBulgusu[] }>(
    `/api/v1/catalog/teams?q=${encodeURIComponent(q)}&limit=20&sport=FOOTBALL`,
  );
  return teleskorResponse(r, "Takım araması yapılamadı.");
}
