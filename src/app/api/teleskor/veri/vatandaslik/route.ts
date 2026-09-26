import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { VatandaslikDurumu } from "@/lib/types";

/**
 * Oyuncunun vatandaşlıkları (motor V106): sağlayıcının listesi ve elle
 * düzeltme. Düzeltmeyi yazanı ürün backend'i oturumdan alıyor.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^\d{1,18}$/.test(id)) {
    return NextResponse.json({ message: "Geçersiz oyuncu." }, { status: 400 });
  }
  const r = await teleskorJson<VatandaslikDurumu>(`/api/v1/admin/engine/veri/vatandaslik?id=${id}`);
  return teleskorResponse(r, "Vatandaşlık bilgisi alınamadı.");
}

export async function PUT(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const r = await teleskorJson<VatandaslikDurumu>("/api/v1/admin/engine/veri/vatandaslik", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return teleskorResponse(r, "Vatandaşlık kaydedilemedi.");
}
