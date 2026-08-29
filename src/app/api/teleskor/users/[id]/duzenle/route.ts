import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorAktor, teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * Üye bilgilerini düzenle — KISMİ, gerekçe ZORUNLU.
 *
 * <p>Teleskor tarafında eski değerlerle birlikte denetim kaydına yazılıyor.
 * E-posta değişirse doğrulama işareti sıfırlanıyor, tüm oturumlar kapanıyor
 * ve kullanıcıya HEM ESKİ HEM YENİ adresine bildirim gidiyor — yönetici bir
 * hesabı e-posta değiştirip devralamasın diye (kabul edilen risk, izsiz
 * yapılması engellenmiş).
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
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const aktor = teleskorAktor(izin.user.displayName || izin.user.email);
  const govde = {
    ...payload,
    reason: `${String(payload.reason ?? "").trim()} [panel: ${aktor}]`.trim(),
  };

  const r = await teleskorJson(
    `/api/v1/admin/users/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(govde) },
  );
  if (r.ok) return NextResponse.json({ ok: true });
  return teleskorResponse(r, "Üye güncellenemedi.");
}
