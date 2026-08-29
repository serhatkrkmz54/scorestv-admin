import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * Hesabı kapat / aç / oturumlarını kapat.
 *
 * <p>Üç ayrı Teleskor ucu tek rotada toplandı ({@code islem} alanıyla):
 * üçü de "gerekçe al, çağır, sonucu döndür" yapıyor. Ayrı dosyalar
 * olsaydı gerekçe imzalama mantığı üç yerde tekrarlanır ve biri
 * değiştiğinde diğerleri sessizce ayrışırdı.
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
  let payload: { islem: "disable" | "enable" | "revoke-sessions"; reason?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const yol =
    payload.islem === "enable"
      ? "enable"
      : payload.islem === "revoke-sessions"
        ? "revoke-sessions"
        : payload.islem === "disable"
          ? "disable"
          : null;
  if (!yol) {
    return NextResponse.json({ message: "Bilinmeyen işlem." }, { status: 400 });
  }

  const aktor = (izin.user.displayName || izin.user.email || "panel").trim();
  const r = await teleskorJson(
    `/api/v1/admin/users/${encodeURIComponent(id)}/${yol}`,
    {
      method: "POST",
      body: JSON.stringify({
        reason: `${(payload.reason ?? "").trim()} [panel: ${aktor}]`.trim(),
      }),
    },
  );
  if (r.ok) return NextResponse.json({ ok: true });
  return teleskorResponse(r, "İşlem tamamlanamadı.");
}
