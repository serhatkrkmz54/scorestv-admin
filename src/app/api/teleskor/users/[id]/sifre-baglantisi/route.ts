import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * Şifre belirleme bağlantısı e-postası (önerilen yol): kullanıcı şifresini
 * kendisi belirler; Google/Apple ile açılmış hesapta şifre OLUŞTURUR.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const { id } = await ctx.params;
  let payload: { reason?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const aktor = (izin.user.displayName || izin.user.email || "panel").trim();
  const r = await teleskorJson(`/api/v1/admin/users/${encodeURIComponent(id)}/sifre-baglantisi`, {
    method: "POST",
    body: JSON.stringify({ reason: `${(payload.reason ?? "").trim()} [panel: ${aktor}]`.trim() }),
  });
  if (r.ok) return NextResponse.json({ ok: true });
  return teleskorResponse(r, "Bağlantı gönderilemedi.");
}
