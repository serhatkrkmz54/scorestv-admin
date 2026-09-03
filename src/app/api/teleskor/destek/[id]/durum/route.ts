import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** ACIK | CEVAPLANDI | KAPALI */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await ctx.params;
  let govde: { durum?: string };
  try {
    govde = (await req.json()) as { durum?: string };
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const r = await teleskorJson<{ id: number; durum: string }>(
    `/api/v1/admin/destek/${encodeURIComponent(id)}/durum`,
    { method: "PATCH", body: JSON.stringify({ durum: govde.durum }) },
  );
  return teleskorResponse(r, "Durum güncellenemedi.");
}
