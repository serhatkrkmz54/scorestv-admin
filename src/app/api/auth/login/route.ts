import { NextResponse, type NextRequest } from "next/server";
import { backendJson } from "@/lib/backend";
import { setAuthCookies } from "@/lib/auth-cookies";
import { panelYetkili } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { AppUser, TokenResponse } from "@/lib/types";

/**
 * Panel girişi — TELESKOR HESABIYLA (e-posta ya da kullanıcı adı).
 *
 * Teleskor `/api/v1/auth/login` yalnız token çiftini döner; rol `/auth/me`'den
 * okunuyor. Yalnız ADMIN kabul edilir (Teleskor'un yönetim uçlarının hepsi
 * ADMIN). Yetkisiz hesapta açılan oturum Teleskor'da HEMEN kapatılıyor —
 * açık bırakılsa hesabın cihaz listesinde "Yönetim paneli" diye asılı kalırdı.
 * Token'lar tarayıcıya gitmez; httpOnly çerezlere yazılır.
 */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  let payload: { identifier?: string; password?: string; rememberMe?: boolean };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await backendJson<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: payload.identifier, password: payload.password }),
  });
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Teleskor sunucusuna ulaşılamıyor." },
      { status: r.status },
    );
  }

  const me = await backendJson<AppUser>("/api/v1/auth/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${r.body.accessToken}` },
  });
  if (!panelYetkili(me.body && me.ok ? me.body : null)) {
    await backendJson("/api/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: r.body.refreshToken }),
    });
    return NextResponse.json(
      { message: "Bu panele yalnız yöneticiler (ADMIN) girebilir." },
      { status: 403 },
    );
  }

  await setAuthCookies(
    r.body.accessToken,
    r.body.refreshToken,
    r.body.expiresInSeconds,
    Boolean(payload.rememberMe),
  );
  return NextResponse.json({ user: me.body });
}
