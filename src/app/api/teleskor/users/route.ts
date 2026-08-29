import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorCreateUserRequest, TeleskorUserPage } from "@/lib/types";

/**
 * Teleskor üyeleri — arama ve hesap açma.
 * Teleskor backend:
 *   GET  /api/v1/admin/users?q=&status=&role=&page=&size=
 *   POST /api/v1/admin/users
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const sp = req.nextUrl.searchParams;
  const q = new URLSearchParams();
  for (const anahtar of ["q", "status", "role", "emailVerified"]) {
    const deger = sp.get(anahtar);
    if (deger) q.set(anahtar, deger);
  }
  q.set("page", sp.get("page") ?? "0");
  q.set("size", sp.get("size") ?? "20");

  const r = await teleskorJson<TeleskorUserPage>(
    `/api/v1/admin/users?${q.toString()}`,
  );
  return teleskorResponse(r, "Üyeler alınamadı.");
}

export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  let payload: TeleskorCreateUserRequest;
  try {
    payload = (await req.json()) as TeleskorCreateUserRequest;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  // Gerekçeye paneldeki kişinin adı ekleniyor: Teleskor'un denetim kaydı
  // işlemi hizmet hesabı üzerinde görüyor, "kim açtı" başka türlü
  // cevaplanamazdı. Sipariş notundan farkı: bu metin KULLANICIYA
  // GÖSTERİLMİYOR, yalnız denetim kaydına giriyor.
  const aktor = (izin.user.displayName || izin.user.email || "panel").trim();
  const govde = {
    ...payload,
    reason: `${(payload.reason ?? "").trim()} [panel: ${aktor}]`.trim(),
  };

  const r = await teleskorJson<{ id: number }>("/api/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(govde),
  });
  return teleskorResponse(r, "Hesap açılamadı.", 201);
}
