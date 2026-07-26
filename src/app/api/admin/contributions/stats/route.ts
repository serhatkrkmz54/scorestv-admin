import { NextResponse } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { ContributionStats } from "@/lib/types";

/** Katkı kuyruğu sayaçları. Backend: GET /api/v1/admin/contributions/stats */
export async function GET() {
  const r = await authorizedBackendJson<ContributionStats>(
    "/api/v1/admin/contributions/stats",
  );
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
