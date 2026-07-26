import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { AdminContributionPage } from "@/lib/types";

/**
 * Katkı Kuyruğu listesi (EDITOR/ADMIN).
 * Backend: GET /api/v1/admin/contributions?status=&page=&size=
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const qs = new URLSearchParams();
  for (const key of ["status", "page", "size"] as const) {
    const v = sp.get(key);
    if (v) qs.set(key, v);
  }
  const r = await authorizedBackendJson<AdminContributionPage>(
    `/api/v1/admin/contributions?${qs.toString()}`,
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Katkılar alınamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
