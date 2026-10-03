import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorSiteHaritasi, teleskorResponse } from "@/lib/teleskor-guard";
import type { SiteHaritasiAyarlari } from "@/lib/types";

/** Kalıbın "noindex" işaretini değiştirir. */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorSiteHaritasi();
  if ("error" in izin) return izin.error;
  const { id } = await ctx.params;
  let payload: { noindex?: boolean };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const r = await teleskorJson<SiteHaritasiAyarlari>(
    `/api/v1/admin/site-haritasi/haricler/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify({ noindex: payload.noindex === true }) },
  );
  return teleskorResponse(r, "Kaydedilemedi.");
}

/** Hariç kalıbı kaldırır. */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorSiteHaritasi();
  if ("error" in izin) return izin.error;
  const { id } = await ctx.params;
  const r = await teleskorJson(
    `/api/v1/admin/site-haritasi/haricler/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (r.ok) return NextResponse.json({ ok: true });
  return teleskorResponse(r, "Kalıp kaldırılamadı.");
}
