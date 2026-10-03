import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorSiteHaritasi, teleskorResponse } from "@/lib/teleskor-guard";
import type { SiteHaritasiRobots } from "@/lib/types";

/** robots.txt'ye Allow/Disallow satırı ekler (siteyi kapatan satırı Teleskor reddeder). */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorSiteHaritasi();
  if ("error" in izin) return izin.error;
  let payload: { kural?: string; yol?: string; not?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const r = await teleskorJson<SiteHaritasiRobots>("/api/v1/admin/site-haritasi/robots", {
    method: "POST",
    body: JSON.stringify({ kural: payload.kural ?? "", yol: payload.yol ?? "", not: payload.not ?? null }),
  });
  return teleskorResponse(r, "Kural eklenemedi.", 201);
}
