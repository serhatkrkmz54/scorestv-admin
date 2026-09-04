import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * ONAYLI HESAP ROZETİ — ver ya da geri al.
 *
 * <p>Rozet bir KİMLİK iddiası ("bu hesap gerçekten o kulüp / o gazeteci"),
 * e-posta doğrulaması değil. Bu yüzden gerekçe zorunlu ve denetim kaydına
 * yazılıyor: yanlış verilmiş bir rozet, kullanıcıların başkasına güvenmesine
 * yol açar ve geri alındığında "kim vermişti" sorusunun cevabı olmalı.
 *
 * <p>Sunucu oturumları KAPATMIYOR — rozet token'da taşınmıyor, kullanıcının
 * yeniden giriş yapmasına gerek yok.
 */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await ctx.params;
  let payload: { onayli: boolean; reason?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  // KİM YAPTI panelden geçiyor: Teleskor tarafı isteği tek bir hizmet
  // hesabıyla görüyor, gerçek yöneticiyi ancak gerekçenin içinden
  // öğrenebiliyor. Diğer yönetim uçlarıyla aynı kalıp.
  const aktor = (izin.user.displayName || izin.user.email || "panel").trim();
  const r = await teleskorJson(
    `/api/v1/admin/users/${encodeURIComponent(id)}/onay-rozeti`,
    {
      method: "PUT",
      body: JSON.stringify({
        onayli: payload.onayli,
        reason: `${(payload.reason ?? "").trim()} [panel: ${aktor}]`.trim(),
      }),
    },
  );
  if (r.ok) return NextResponse.json({ ok: true });
  return teleskorResponse(r, "Rozet güncellenemedi.");
}
