import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorPointAccount } from "@/lib/types";

/** GET — bakiye + son hareketler. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await ctx.params;
  const r = await teleskorJson<TeleskorPointAccount>(
    `/api/v1/admin/users/${encodeURIComponent(id)}/telepuan`,
  );
  return teleskorResponse(r, "Telepuan bilgisi alınamadı.");
}

/**
 * POST — elle Telepuan ekle / düş.
 *
 * <h3>Bu uç dolaylı olarak ödül dağıtıyor</h3>
 * Telepuan markette gerçek ürüne dönüşüyor. Bu yüzden gerekçe zorunlu ve
 * paneldeki kişinin adı gerekçeye ekleniyor — "kim, kime, neden, ne
 * kadar" sorusu Teleskor'un denetim zincirinden cevaplanabilmeli.
 *
 * <p>Açıklama (kullanıcının hareket listesinde göreceği metin) İMZALANMIYOR:
 * o metin son kullanıcıya gösteriliyor ve paneldeki editörün adı orada
 * işi yok.
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
  let payload: { miktar: number; aciklama?: string; reason?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const aktor = (izin.user.displayName || izin.user.email || "panel").trim();
  const r = await teleskorJson<{ bakiye: number; miktar: number }>(
    `/api/v1/admin/users/${encodeURIComponent(id)}/telepuan`,
    {
      method: "POST",
      body: JSON.stringify({
        miktar: payload.miktar,
        aciklama: payload.aciklama ?? null,
        reason: `${(payload.reason ?? "").trim()} [panel: ${aktor}]`.trim(),
      }),
    },
  );
  return teleskorResponse(r, "Telepuan işlemi yapılamadı.");
}
