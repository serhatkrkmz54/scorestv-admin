import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TvMac } from "@/lib/types";

/**
 * TV KANALI DÜZELTME — günün maçları: takım adı ya da maç kimliğiyle.
 * Her maçta sağlayıcının ülke ülke kanalları ve elle eklenenler.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const gun = req.nextUrl.searchParams.get("gun") ?? "";
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gun)) {
    return NextResponse.json({ message: "Gün YYYY-AA-GG olmalı." }, { status: 400 });
  }
  if (q.length < 2 && !/^\d+$/.test(q)) return NextResponse.json([]);
  const r = await teleskorJson<TvMac[]>(
    `/api/v1/admin/engine/tv/maclar?gun=${gun}&q=${encodeURIComponent(q)}`,
  );
  return teleskorResponse(r, "Maçlar alınamadı.");
}
