import { NextResponse, type NextRequest } from "next/server";
import { backendJson } from "@/lib/backend";
import { setAuthCookies } from "@/lib/auth-cookies";
import { checkSameOrigin } from "@/lib/origin-check";
import type { AuthResponse } from "@/lib/types";

/**
 * Panel girişi. Backend /api/v1/auth/login token paketini gövdede döner
 * (accessToken/refreshToken/expiresIn/user). Panel bu token'ları httpOnly
 * çerezlere yazar. Yalnızca EDITOR/ADMIN rolü kabul edilir; USER reddedilir.
 */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  let payload: { email?: string; password?: string; rememberMe?: boolean };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await backendJson<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  });

  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Sunucuya ulaşılamıyor." },
      { status: r.status },
    );
  }

  const role = r.body.user?.role;
  if (role !== "EDITOR" && role !== "ADMIN") {
    // Token'ları YAZMA — bu hesabın panele erişimi yok.
    return NextResponse.json(
      { message: "Bu panele yalnızca editör ve yöneticiler erişebilir." },
      { status: 403 },
    );
  }

  await setAuthCookies(
    r.body.accessToken,
    r.body.refreshToken,
    r.body.expiresIn,
    Boolean(payload.rememberMe),
  );
  return NextResponse.json({ user: r.body.user });
}
