import { NextResponse } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { AppStats } from "@/lib/types";

/**
 * Uygulama İstatistikleri (GET).
 * Backend: GET /api/v1/admin/stats/app — EDITOR/ADMIN yetkisi ister, token
 * forward edilir, 401'de bir kez refresh+retry yapılır.
 */
export async function GET() {
  const r = await authorizedBackendJson<AppStats>("/api/v1/admin/stats/app");

  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "İstatistikler alınamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
