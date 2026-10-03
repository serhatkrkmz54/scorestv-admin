import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * Şifreyi yönetici belirler. Şifre yalnız Teleskor'a iletilir: burada
 * hiçbir yere yazılmaz (log, hata metni), Teleskor da kayda/e-postaya yazmaz.
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const { id } = await ctx.params;
  let payload: { sifre?: string; oturumlariKapat?: boolean | null; reason?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const aktor = (izin.user.displayName || izin.user.email || "panel").trim();
  const r = await teleskorJson<{ oturumlarKapandi: boolean }>(
    `/api/v1/admin/users/${encodeURIComponent(id)}/sifre`,
    {
      method: "PUT",
      body: JSON.stringify({
        sifre: payload.sifre ?? "",
        oturumlariKapat: typeof payload.oturumlariKapat === "boolean" ? payload.oturumlariKapat : null,
        reason: `${(payload.reason ?? "").trim()} [panel: ${aktor}]`.trim(),
      }),
    },
  );
  return teleskorResponse(r, "Şifre belirlenemedi.");
}
