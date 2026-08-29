import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { CeviriSayfasi } from "@/lib/types";

/**
 * ÇEVİRİ DÜZELTME MASASI — ad düzeltmeleri.
 *
 * <p>Zincir: panel → teleskor-backend → sports-engine. Motor özel ağda ve
 * panelin makinesinden erişilemiyor (ölçüldü), bu yüzden ürün backend'i
 * dar bir vekil olarak araya giriyor.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const sp = req.nextUrl.searchParams;
  const q = new URLSearchParams();
  q.set("tur", sp.get("tur") ?? "TEAM");
  const arama = sp.get("q");
  if (arama) q.set("q", arama);
  q.set("sadeceEksik", sp.get("sadeceEksik") ?? "false");
  q.set("limit", sp.get("limit") ?? "200");
  q.set("offset", sp.get("offset") ?? "0");

  const r = await teleskorJson<CeviriSayfasi>(
    `/api/v1/admin/engine/ceviri?${q.toString()}`,
  );
  return teleskorResponse(r, "Çeviri listesi alınamadı.");
}

/** Boş {@code ad} düzeltmeyi kaldırır — ad sağlayıcı çevirisine döner. */
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

  const r = await teleskorJson("/api/v1/admin/engine/ceviri", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return teleskorResponse(r, "Düzeltme kaydedilemedi.");
}
