import { NextResponse } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";

/**
 * GET /api/news/translate/status — çeviri servisi yapılandırılmış mı?
 * Backend: GET /api/v1/admin/news/translate/status → { enabled }.
 * Hata/oturum yoksa güvenli varsayılan: { enabled: false }.
 */
export async function GET() {
  const r = await authorizedBackendJson<{ enabled: boolean }>(
    "/api/v1/admin/news/translate/status",
  );
  if (!r.ok || !r.body) {
    return NextResponse.json({ enabled: false });
  }
  return NextResponse.json(r.body);
}
