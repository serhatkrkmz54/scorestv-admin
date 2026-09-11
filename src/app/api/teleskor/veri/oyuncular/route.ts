import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { VeriOyuncusu } from "@/lib/types";

/**
 * Takımın oyuncuları, eksik alan sayılarıyla — takım kartındaki liste.
 *
 * <p>Zincir: panel → teleskor-backend → sports-engine. Motor özel ağda ve bu
 * makineden erişilemiyor, ürün backend'i dar bir vekil olarak araya giriyor.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const takim = req.nextUrl.searchParams.get("takim");
  if (!takim || !/^\d+$/.test(takim)) {
    return NextResponse.json({ message: "Takım seçilmedi." }, { status: 400 });
  }

  const r = await teleskorJson<VeriOyuncusu[]>(
    `/api/v1/admin/engine/veri/oyuncular?takim=${takim}`,
  );
  return teleskorResponse(r, "Oyuncu listesi alınamadı.");
}
