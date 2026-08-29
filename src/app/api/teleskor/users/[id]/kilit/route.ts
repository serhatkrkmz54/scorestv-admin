import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorAktor, teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * Kaba kuvvet kilidini açar.
 *
 * <p>Şifresini üst üste yanlış giren kullanıcı 15 dakika bekliyor. Destek
 * arayan kullanıcıyı bekletmek yerine kilidi buradan açıyor.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await ctx.params;
  let payload: { reason?: string } = {};
  try {
    payload = (await req.json()) as { reason?: string };
  } catch {
    /* gövdesiz de gelebilir */
  }

  const aktor = teleskorAktor(izin.user.displayName || izin.user.email);
  const r = await teleskorJson(
    `/api/v1/admin/users/${encodeURIComponent(id)}/unlock`,
    {
      method: "POST",
      body: JSON.stringify({
        reason: `${(payload.reason ?? "").trim()} [panel: ${aktor}]`.trim(),
      }),
    },
  );
  if (r.ok) return NextResponse.json({ ok: true });
  return teleskorResponse(r, "Kilit açılamadı.");
}
