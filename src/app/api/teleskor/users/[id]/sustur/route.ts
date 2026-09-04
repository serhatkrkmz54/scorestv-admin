import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * SUSTURMA — süreli yazma yasağı.
 *
 * <p>Hesabı KAPATMIYOR: kullanıcı giriş yapıyor, okuyor, favorilerini
 * yönetiyor ve desteğe yazabiliyor. Kapanan tek şey içerik üretmek —
 * gönderi, yorum, sohbet mesajı.
 *
 * <p>Gerekçe zorunlu ve <b>kullanıcıya gösteriliyor</b>: yazma yolundaki
 * 403 mesajı bu metni taşıyor. Sebebi görmeyen kullanıcı davranışını
 * düzeltemez.
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
  let payload: { saat: number; reason?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  // GEREKÇEYE PANEL ETİKETİ EKLENMİYOR — diğer yönetim uçlarından farkı.
  // Bu metin kullanıcının ekranında birebir görünüyor; "[panel: Serhat]"
  // eki hem anlamsız hem de moderatörün adını cezalandırdığı kişiye
  // göstermek olurdu. "Kim yaptı" bilgisi denetim kaydında zaten var
  // (actor_user_id), yani hiçbir şey kaybolmuyor.
  const r = await teleskorJson(
    `/api/v1/admin/users/${encodeURIComponent(id)}/sustur`,
    {
      method: "POST",
      body: JSON.stringify({
        saat: payload.saat,
        reason: (payload.reason ?? "").trim(),
      }),
    },
  );
  if (r.ok) return NextResponse.json({ ok: true });
  return teleskorResponse(r, "Susturma uygulanamadı.");
}

/**
 * Susturmayı kaldırır.
 *
 * <p>Gerekçe burada da zorunlu: cezayı kaldırmak da bir moderasyon kararı
 * ve denetim kaydında görünmesi gerekiyor. Bu metin kullanıcıya
 * GÖSTERİLMİYOR (gösterilecek bir yasak kalmadı), o yüzden panel etiketi
 * ekleniyor.
 */
export async function DELETE(
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
    payload = (await req.json()) as typeof payload;
  } catch {
    // Gövdesiz DELETE olağan — gerekçe zorunluluğunu sunucu söyleyecek.
  }

  const aktor = (izin.user.displayName || izin.user.email || "panel").trim();
  const r = await teleskorJson(
    `/api/v1/admin/users/${encodeURIComponent(id)}/sustur`,
    {
      method: "DELETE",
      body: JSON.stringify({
        reason: `${(payload.reason ?? "").trim()} [panel: ${aktor}]`.trim(),
      }),
    },
  );
  if (r.ok) return NextResponse.json({ ok: true });
  return teleskorResponse(r, "Susturma kaldırılamadı.");
}
