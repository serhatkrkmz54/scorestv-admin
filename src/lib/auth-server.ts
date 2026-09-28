import "server-only";
import { backendJson, backendFetch, type BackendResult } from "./backend";
import {
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
  setAuthCookies,
} from "./auth-cookies";
import type { AppUser, TokenResponse } from "./types";

/**
 * Geçerli oturumun kullanıcısını çözer (LAYOUT RENDER'ında çağrılır).
 *
 * access token geçerliyse /me döner. Süresi dolmuşsa BURADA rotasyon YAPMAZ:
 * Next.js render sırasında cookie yazılamadığı için yeni refresh token
 * kaybolur, eski token "yeniden kullanıldı" sanılıp Teleskor bütün
 * oturumları kapatırdı (hırsızlık tespiti ROTATED tekrarında). Tazeleme
 * middleware'de (çerezi kalıcı yazan yer) yapılıyor; bu fonksiyon render'a
 * geldiğinde access token zaten taze olur. Taze değilse null (layout
 * /login'e yönlendirir) — asla oturum-nuke tetiklemeyiz.
 */
export async function resolveUser(): Promise<AppUser | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  const r = await backendJson<AppUser>("/api/v1/auth/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (r.ok && r.body) return r.body;
  return null;
}

/**
 * ROUTE HANDLER için kullanıcı çözümü — resolveUser gibidir ama access token
 * süresi dolmuşsa refresh + persist DENER (route handler'da cookie yazılabilir).
 * RENDER'da KULLANMA (orada resolveUser kullan; render'da cookie yazılamaz).
 */
export async function resolveUserAllowRefresh(): Promise<AppUser | null> {
  const token = await getForwardAccessToken();
  if (!token) return null;
  const r = await backendJson<AppUser>("/api/v1/auth/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.ok && r.body ? r.body : null;
}

/**
 * Panele kim girebilir: Teleskor'da rolü ADMIN olan hesap.
 *
 * Teleskor'un bütün yönetim uçları `hasRole('ADMIN')`; EDITOR rolüyle
 * girilseydi her sayfa 403 verirdi. Yeni yönetici: Teleskor'da hesap aç,
 * panelde Üyeler → rol ADMIN (ya da veritabanında
 * `UPDATE users SET role='ADMIN' WHERE username='…'`).
 */
export function panelYetkili(user: AppUser | null): boolean {
  return !!user && user.role === "ADMIN";
}

/**
 * Refresh token ile yeni access token alır ve çerezleri tazeler.
 * Başarısızsa çerezleri temizleyip null döner.
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  const rr = await backendJson<TokenResponse>("/api/v1/auth/refresh", {
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
    rr.body.expiresInSeconds,
    true,
  );
  return rr.body.accessToken;
}

/**
 * Oturum varsa Teleskor'a iletilecek access token'ı döner (gerekirse
 * refresh eder), yoksa null.
 */
export async function getForwardAccessToken(): Promise<string | null> {
  const at = await getAccessToken();
  if (at) return at;
  return refreshAccessToken();
}

/**
 * Oturum GEREKTİREN Teleskor istekleri: Bearer token ekler; 401 dönerse bir
 * kez refresh + retry. Oturum yoksa/refresh başarısızsa {unauthorized:true}.
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

/**
 * Oturumlu multipart istek (dosya yükleme). {@link authorizedBackendJson}
 * ile aynı token kuralı; Content-Type'ı fetch kendisi yazar (sınır dizesi).
 */
export async function authorizedBackendForm(
  path: string,
  form: FormData,
): Promise<{ res: Response | null; unauthorized?: boolean }> {
  let token = (await getAccessToken()) ?? null;
  if (!token) {
    token = await refreshAccessToken();
    if (!token) return { res: null, unauthorized: true };
  }
  const gonder = (t: string) =>
    backendFetch(path, {
      method: "POST",
      body: form,
      headers: { Authorization: `Bearer ${t}` },
    });
  let res = await gonder(token);
  if (res && res.status === 401) {
    const fresh = await refreshAccessToken();
    if (!fresh) return { res: null, unauthorized: true };
    res = await gonder(fresh);
  }
  return { res };
}
