import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorSiteHaritasi, teleskorResponse } from "@/lib/teleskor-guard";
import type { SiteHaritasiAyarlari } from "@/lib/types";

/** Tür ayarı: açık/kapalı, öncelik, sıklık (boş = sitenin kendi değeri). */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ tur: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorSiteHaritasi();
  if ("error" in izin) return izin.error;
  const { tur } = await ctx.params;
  let payload: { acik?: boolean; oncelik?: number | null; siklik?: string | null };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const r = await teleskorJson<SiteHaritasiAyarlari>(
    `/api/v1/admin/site-haritasi/turler/${encodeURIComponent(tur)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        acik: payload.acik !== false,
        oncelik: payload.oncelik ?? null,
        siklik: payload.siklik || null,
      }),
    },
  );
  return teleskorResponse(r, "Tür ayarı kaydedilemedi.");
}
