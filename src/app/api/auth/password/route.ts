import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { setAuthCookies } from "@/lib/auth-cookies";
import { checkSameOrigin } from "@/lib/origin-check";
import type { AuthResponse, ChangePasswordRequest } from "@/lib/types";

/**
 * Şifre değiştir (Ayarlar → Profil).
 * Backend: POST /api/v1/auth/change-password (ChangePasswordRequest) →
 * AuthResponse. Backend başarıda TÜM refresh token'ları iptal edip YENİ bir
 * token çifti döner; bu yüzden mevcut oturumun düşmemesi için dönen token'ları
 * httpOnly çerezlere yazarız. Token'lar istemciye ASLA gönderilmez.
 */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  let payload: ChangePasswordRequest;
  try {
    payload = (await req.json()) as ChangePasswordRequest;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await authorizedBackendJson<AuthResponse>(
    "/api/v1/auth/change-password",
    { method: "POST", body: JSON.stringify(payload) },
  );

  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Şifre değiştirilemedi." },
      { status: r.status },
    );
  }

  // Şifre değişince backend eski token'ları iptal etti — yeni çifti kalıcı yaz
  // ki bu oturum kapanmasın.
  await setAuthCookies(
    r.body.accessToken,
    r.body.refreshToken,
    r.body.expiresIn,
    true,
  );
  return NextResponse.json({ ok: true });
}
