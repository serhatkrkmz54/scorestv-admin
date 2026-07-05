import "server-only";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./cookie-names";

// Panel çerezleri public web'den AYRI isim uzayı kullanır (admin.* alt alan
// adında çakışmayı önlemek için). httpOnly + sameSite=lax.
export { ACCESS_COOKIE, REFRESH_COOKIE };

const REFRESH_MAX_AGE = 60 * 60 * 24 * 14; // 14 gün (backend refresh-token-ttl)

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  remember: boolean,
): Promise<void> {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";
  const common = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };

  store.set(ACCESS_COOKIE, accessToken, { ...common, maxAge: Math.max(expiresIn, 60) });
  store.set(REFRESH_COOKIE, refreshToken, {
    ...common,
    // remember=false → oturum çerezi (tarayıcı kapanınca silinir)
    ...(remember ? { maxAge: REFRESH_MAX_AGE } : {}),
  });
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}
