import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type {
  TeleskorMarketProduct,
  TeleskorMarketProductRequest,
} from "@/lib/types";

/**
 * Teleskor Telepuan Marketi — ürünler.
 * Teleskor backend:
 *   GET  /api/v1/admin/market/urunler
 *   POST /api/v1/admin/market/urunler
 */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const r = await teleskorJson<TeleskorMarketProduct[]>(
    "/api/v1/admin/market/urunler",
  );
  return teleskorResponse(r, "Ürünler alınamadı.");
}

export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  let payload: TeleskorMarketProductRequest;
  try {
    payload = (await req.json()) as TeleskorMarketProductRequest;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await teleskorJson<TeleskorMarketProduct>(
    "/api/v1/admin/market/urunler",
    { method: "POST", body: JSON.stringify(payload) },
  );
  return teleskorResponse(r, "Ürün eklenemedi.", 201);
}
