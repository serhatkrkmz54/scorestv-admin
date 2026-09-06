import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * GÜNÜN MAÇLARI — panelin maç seçici listesi.
 *
 * <h3>Neden Teleskor'un HERKESE AÇIK ucundan</h3>
 * Maç verisi motorda ve Teleskor onu zaten önbellekli olarak sunuyor
 * ({@code GET /api/v1/matches?date=}). Yönetim tarafına ikinci bir maç
 * listeleme ucu yazılsaydı aynı veri iki ayrı yoldan, iki ayrı önbellek
 * davranışıyla dönerdi ve biri düzeltilirken diğeri unutulurdu.
 *
 * <p>Uç açık olduğu için burada teknik olarak yetki gerekmiyor; yine de
 * ADMIN kapısı var — bu rota yalnız yönetim ekranını besliyor ve panelin
 * her rotasının aynı kuralı taşıması, bir gün açık kalanı fark etmeyi
 * kolaylaştırıyor.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const date = req.nextUrl.searchParams.get("date") ?? "";
  const sport = req.nextUrl.searchParams.get("sport") === "BASKETBALL"
    ? "BASKETBALL"
    : "FOOTBALL";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { message: "Tarih YYYY-AA-GG biçiminde olmalı." },
      { status: 400 },
    );
  }

  const r = await teleskorJson<unknown>(
    `/api/v1/matches?date=${date}&sport=${sport}&timeZone=Europe%2FIstanbul`,
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Maç listesi alınamadı.");
}
