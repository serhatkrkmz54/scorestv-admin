import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorSiteHaritasi, teleskorResponse } from "@/lib/teleskor-guard";
import type { SiteHaritasiEkAdres } from "@/lib/types";

/** Genel haritaya elle adres ekler (sitenin kökünden yol, "/..." ile başlar). */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorSiteHaritasi();
  if ("error" in izin) return izin.error;
  let payload: { yol?: string; oncelik?: number | null; siklik?: string | null; not?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const r = await teleskorJson<SiteHaritasiEkAdres>("/api/v1/admin/site-haritasi/ek-adresler", {
    method: "POST",
    body: JSON.stringify({
      yol: payload.yol ?? "",
      oncelik: payload.oncelik ?? null,
      siklik: payload.siklik || null,
      not: payload.not ?? null,
    }),
  });
  return teleskorResponse(r, "Adres eklenemedi.", 201);
}
