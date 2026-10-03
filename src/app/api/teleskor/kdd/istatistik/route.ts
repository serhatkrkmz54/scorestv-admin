import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** Günlük istatistik (gun: YYYY-AA-GG, boşsa bugün). */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const gun = req.nextUrl.searchParams.get("gun") ?? "";
  if (gun && !/^\d{4}-\d{2}-\d{2}$/.test(gun)) {
    return NextResponse.json({ message: "Tarih YYYY-AA-GG olmalı." }, { status: 400 });
  }
  const r = await teleskorJson(`/api/v1/admin/kim-daha-degerli/istatistik${gun ? `?gun=${gun}` : ""}`);
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "İstatistik alınamadı.");
}
