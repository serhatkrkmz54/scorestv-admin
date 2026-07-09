import { NextResponse } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { NewsStats } from "@/lib/types";

/**
 * Panel dashboard özeti (GET).
 * Backend: GET /api/v1/admin/news/stats — EDITOR/ADMIN yetkisi ister, token forward edilir.
 */
export async function GET() {
  const r = await authorizedBackendJson<NewsStats>("/api/v1/admin/news/stats");

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
