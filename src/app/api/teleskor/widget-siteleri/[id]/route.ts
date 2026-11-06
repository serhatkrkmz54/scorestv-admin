import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { WidgetSitesi } from "@/lib/types";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const { id } = await ctx.params;
  if (!/^\d{1,12}$/.test(id)) {
    return NextResponse.json({ message: "Geçersiz kimlik." }, { status: 400 });
  }
  let govde: unknown;
  try {
    govde = await req.json();
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const r = await teleskorJson<WidgetSitesi>(`/api/v1/admin/widget-siteleri/${id}`, {
    method: "PUT",
    body: JSON.stringify(govde),
  });
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Site güncellenemedi.");
}
