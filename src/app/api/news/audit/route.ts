import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { NewsAuditPage } from "@/lib/types";

/** GET /api/v1/admin/news/audit — denetim günlüğü (EDITOR/ADMIN). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const qs = new URLSearchParams();
  for (const key of ["action", "page", "size"]) {
    const v = sp.get(key);
    if (v !== null && v !== "") qs.set(key, v);
  }
  const path = `/api/v1/admin/news/audit${qs.toString() ? `?${qs.toString()}` : ""}`;
  const r = await authorizedBackendJson<NewsAuditPage>(path);
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Denetim günlüğü alınamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
