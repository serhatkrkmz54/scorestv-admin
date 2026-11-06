import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { WidgetSitesi, WidgetSitesiSatiri } from "@/lib/types";

/**
 * WİDGET SİTELERİ — teleskor.com.tr/w/... widget'larını gömen siteler.
 * Kural Teleskor'da (alan adı, tür denetimi, anahtar üretimi); burası düz geçiş.
 */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const r = await teleskorJson<WidgetSitesiSatiri[]>("/api/v1/admin/widget-siteleri");
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Widget siteleri alınamadı.");
}

export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  let govde: unknown;
  try {
    govde = await req.json();
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const r = await teleskorJson<WidgetSitesi>("/api/v1/admin/widget-siteleri", {
    method: "POST",
    body: JSON.stringify(govde),
  });
  if (r.ok) return NextResponse.json(r.body, { status: 201 });
  return teleskorResponse(r, "Site eklenemedi.");
}
