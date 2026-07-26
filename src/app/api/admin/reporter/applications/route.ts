import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { AdminReporterApplicationPage } from "@/lib/types";

/**
 * Muhabir başvuruları listesi (EDITOR/ADMIN).
 * Backend: GET /api/v1/admin/reporter/applications?status=&page=&size=
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const qs = new URLSearchParams();
  for (const key of ["status", "page", "size"] as const) {
    const v = sp.get(key);
    if (v) qs.set(key, v);
  }
  const r = await authorizedBackendJson<AdminReporterApplicationPage>(
    `/api/v1/admin/reporter/applications?${qs.toString()}`,
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Başvurular alınamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
