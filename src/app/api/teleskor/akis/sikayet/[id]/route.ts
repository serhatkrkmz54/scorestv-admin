import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** Şikayeti yersiz bulup içeriğe DOKUNMADAN kapat. */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await ctx.params;
  const r = await teleskorJson(
    `/api/v1/admin/akis/sikayetler/${encodeURIComponent(id)}/kapat`,
    { method: "POST" },
  );
  if (r.ok) return NextResponse.json({ ok: true });
  return teleskorResponse(r, "Şikayet kapatılamadı.");
}
