import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { VeriUlkesi } from "@/lib/types";

/**
 * Ülke seçici (motor V106) — oyuncunun Ülke alanı ve vatandaşlık listesi.
 * `?q=` arar, `?ids=` kimlik çözer, `?spor=` futbol 1 / basketbol 2.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").trim();
  const spor = req.nextUrl.searchParams.get("spor") === "2" ? 2 : 1;
  if (ids && !/^\d+(,\d+)*$/.test(ids)) {
    return NextResponse.json({ message: "Geçersiz kimlik listesi." }, { status: 400 });
  }
  if (!ids && q.length < 1) {
    return NextResponse.json([]);
  }
  const r = await teleskorJson<VeriUlkesi[]>(
    `/api/v1/admin/engine/veri/ulkeler?q=${encodeURIComponent(q)}&ids=${encodeURIComponent(ids)}&spor=${spor}`,
  );
  return teleskorResponse(r, "Ülke listesi alınamadı.");
}
