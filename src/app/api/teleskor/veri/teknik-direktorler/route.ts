import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { VeriTeknikDirektor } from "@/lib/types";

/**
 * Teknik direktör seçici (motor V107): `?q=` arar, `?ids=` mevcut değeri çözer.
 * POST: katalogda olmayan teknik direktörü açar; açanı ürün backend'i
 * oturumdan alır. Motorun 409'u (aynı adda kayıt) düz geçer.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").trim();
  if (ids && !/^\d+(,\d+)*$/.test(ids)) {
    return NextResponse.json({ message: "Geçersiz kimlik listesi." }, { status: 400 });
  }
  if (!ids && q.length < 2) {
    return NextResponse.json([]);
  }
  const r = await teleskorJson<VeriTeknikDirektor[]>(
    `/api/v1/admin/engine/veri/teknik-direktorler?q=${encodeURIComponent(q)}&ids=${encodeURIComponent(ids)}`,
  );
  return teleskorResponse(r, "Teknik direktör listesi alınamadı.");
}

export async function POST(req: NextRequest) {
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
  const r = await teleskorJson<VeriTeknikDirektor>("/api/v1/admin/engine/veri/teknik-direktorler", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return teleskorResponse(r, "Teknik direktör açılamadı.");
}
