import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { setAuthCookies } from "@/lib/auth-cookies";
import { checkSameOrigin } from "@/lib/origin-check";
import type { TokenResponse } from "@/lib/types";

/**
 * Şifre değiştir (Ayarlar → Hesap) — Teleskor `POST /api/v1/auth/password`.
 * Teleskor diğer bütün oturumları kapatıp BU cihaza yeni token çifti veriyor;
 * panelin oturumu düşmesin diye yeni çift çereze yazılıyor. Şifre kuralı
 * Teleskor'da (8-72 karakter, sözlük denetimi); hata metni olduğu gibi geçer.
 */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  let payload: { currentPassword?: string; password?: string; passwordConfirm?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await authorizedBackendJson<TokenResponse>("/api/v1/auth/password", {
    method: "POST",
    body: JSON.stringify({
      currentPassword: payload.currentPassword,
      password: payload.password,
      passwordConfirm: payload.passwordConfirm,
    }),
  });
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(r.body ?? { message: "Şifre değiştirilemedi." }, {
      status: r.status,
    });
  }
  await setAuthCookies(r.body.accessToken, r.body.refreshToken, r.body.expiresInSeconds, true);
  return NextResponse.json({ ok: true });
}
