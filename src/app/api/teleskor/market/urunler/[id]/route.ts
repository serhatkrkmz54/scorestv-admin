import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type {
  TeleskorMarketProduct,
  TeleskorMarketProductRequest,
} from "@/lib/types";

/** PUT — KISMİ güncelleme: gönderilmeyen alana dokunulmuyor. */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await ctx.params;
  let payload: TeleskorMarketProductRequest;
  try {
    payload = (await req.json()) as TeleskorMarketProductRequest;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await teleskorJson<TeleskorMarketProduct>(
    `/api/v1/admin/market/urunler/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  return teleskorResponse(r, "Ürün güncellenemedi.");
}

/**
 * DELETE — SİLMEZ, PASİFLEŞTİRİR.
 *
 * Teleskor tarafında ürün satırını gerçekten silmek mümkün değil: siparişler
 * ona yabancı anahtarla bağlı ve kullanıcıların sipariş geçmişi kaybolurdu.
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
  const r = await teleskorJson(
    `/api/v1/admin/market/urunler/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (r.ok) return NextResponse.json({ ok: true });
  return teleskorResponse(r, "Ürün pasifleştirilemedi.");
}
