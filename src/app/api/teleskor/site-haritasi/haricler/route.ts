import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorSiteHaritasi, teleskorResponse } from "@/lib/teleskor-guard";
import type { SiteHaritasiHaric } from "@/lib/types";

/** Hariç kalıp ekler ("/haber/*" gibi; * herhangi bir şey); noindex = sayfalara da "dizine ekleme". */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorSiteHaritasi();
  if ("error" in izin) return izin.error;
  let payload: { kalip?: string; noindex?: boolean; not?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const r = await teleskorJson<SiteHaritasiHaric>("/api/v1/admin/site-haritasi/haricler", {
    method: "POST",
    body: JSON.stringify({
      kalip: payload.kalip ?? "",
      noindex: payload.noindex === true,
      not: payload.not ?? null,
    }),
  });
  return teleskorResponse(r, "Kalıp eklenemedi.", 201);
}
