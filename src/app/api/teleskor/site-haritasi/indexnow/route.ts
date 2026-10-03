import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorSiteHaritasi, teleskorResponse } from "@/lib/teleskor-guard";
import type { SiteHaritasiIndexNowSonucu } from "@/lib/types";

/** Adresleri IndexNow'a bildirir (Bing, Yandex; Google okumuyor). Günlük tavan Teleskor'da. */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorSiteHaritasi();
  if ("error" in izin) return izin.error;
  let payload: { adresler?: unknown };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const adresler = Array.isArray(payload.adresler)
    ? payload.adresler.filter((a): a is string => typeof a === "string").slice(0, 200)
    : [];
  const r = await teleskorJson<SiteHaritasiIndexNowSonucu>("/api/v1/admin/site-haritasi/indexnow", {
    method: "POST",
    body: JSON.stringify({ adresler }),
  });
  return teleskorResponse(r, "Bildirilemedi.");
}
