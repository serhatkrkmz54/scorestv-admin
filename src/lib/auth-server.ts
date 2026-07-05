import "server-only";
import { backendJson, type BackendResult } from "./backend";
import {
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
  setAuthCookies,
} from "./auth-cookies";
import type { AppUser, AuthResponse } from "./types";

/**
 * Geçerli oturumun kullanıcısını çözer.
 * access token geçerliyse /me döner; 401 ise refresh dener ve çerezleri tazeler.
 * (Public web auth-server.ts ile aynı desen.)
 */
export async function resolveUser(): Promise<AppUser | null> {
  const accessToken = await getAccessToken();
  if (accessToken) {
    const r = await backendJson<AppUser>("/api/v1/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (r.ok && r.body) return r.body;
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const rr = await backendJson<AuthResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  if (!rr.ok || !rr.body) {
    await clearAuthCookies();
    return null;
  }
  await setAuthCookies(rr.body.accessToken, rr.body.refreshToken, rr.body.expiresIn, true);
  return rr.body.user;
}

/** EDITOR veya ADMIN mı? Panel erişim yetkisi bu koşula bağlı. */
export function isEditorOrAdmin(user: AppUser | null): boolean {
  return !!user && (user.role === "EDITOR" || user.role === "ADMIN");
}

/**
 * Refresh token ile yeni access token alır ve çerezleri tazeler.
 * Başarısızsa çerezleri temizleyip null döner.
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  const rr = await backendJson<AuthResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  if (!rr.ok || !rr.body) {
    await clearAuthCookies();
    return null;
  }
  await setAuthCookies(
    rr.body.accessToken,
    rr.body.refreshToken,
    rr.body.expiresIn,
    true,
  );
  return rr.body.accessToken;
}

/**
 * Opsiyonel-auth istekler için: oturum varsa backend'e iletilecek access
 * token'ı döner (gerekirse refresh eder), yoksa null.
 */
export async function getForwardAccessToken(): Promise<string | null> {
  const at = await getAccessToken();
  if (at) return at;
  return refreshAccessToken();
}

/**
 * Auth GEREKTİREN backend istekleri için yardımcı. Bearer token enjekte eder;
 * 401 dönerse bir kez refresh + retry yapar. Oturum yoksa/refresh başarısızsa
 * {unauthorized:true} döner.
 */
export async function authorizedBackendJson<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<BackendResult<T> & { unauthorized?: boolean }> {
  let token = (await getAccessToken()) ?? null;
  if (!token) {
    token = await refreshAccessToken();
    if (!token) return { ok: false, status: 401, body: null, unauthorized: true };
  }
  const withAuth = (t: string): RequestInit => ({
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${t}` },
  });
  let r = await backendJson<T>(path, withAuth(token));
  if (r.status === 401) {
    const fresh = await refreshAccessToken();
    if (!fresh) return { ok: false, status: 401, body: null, unauthorized: true };
    r = await backendJson<T>(path, withAuth(fresh));
  }
  return r;
}
