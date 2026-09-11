import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * VERİ DÜZELTME MASASI — alan yamaları (kapasite, şehir, mevki, doğum tarihi…).
 *
 * <p>Zincir: panel → teleskor-backend → sports-engine. Motor özel ağda ve bu
 * makineden erişilemiyor, ürün backend'i dar bir vekil olarak araya giriyor.
 *
 * <p>Yamayı KİMİN yazdığı burada gönderilmiyor: ürün backend'i onu oturumdan
 * alıyor. İstemciden gelseydi denetim kaydı istemcinin beyanına dayanırdı.
 */
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

  const r = await teleskorJson("/api/v1/admin/engine/veri", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return teleskorResponse(r, "Düzeltme kaydedilemedi.");
}
