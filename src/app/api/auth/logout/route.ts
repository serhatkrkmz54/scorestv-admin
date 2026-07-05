import { NextResponse } from "next/server";
import { backendJson } from "@/lib/backend";
import { clearAuthCookies, getRefreshToken } from "@/lib/auth-cookies";

export async function POST() {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    // Backend tarafında refresh token'ı iptal et (hata olsa da çerezleri temizleriz).
    await backendJson("/api/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }
  await clearAuthCookies();
  return NextResponse.json({ ok: true });
}
