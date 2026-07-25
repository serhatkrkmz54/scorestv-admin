import { NextResponse } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { AdminAppUserStats } from "@/lib/types";

/** Üyeler üst istatistik kartları. Backend: GET /api/v1/admin/users/stats */
export async function GET() {
  const r = await authorizedBackendJson<AdminAppUserStats>(
    "/api/v1/admin/users/stats",
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
