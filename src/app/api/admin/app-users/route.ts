import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { AdminAppUserPage } from "@/lib/types";

/**
 * Üyeler (tüm kullanıcılar) — filtreli/sayfalı liste. Yalnız ADMIN
 * (rol kontrolü backend'de; EDITOR 403 alır).
 * Backend: GET /api/v1/admin/users?query=&role=&enabled=&provider=&page=&size=
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const qs = new URLSearchParams();
  for (const key of ["query", "role", "enabled", "provider", "page", "size"] as const) {
    const v = sp.get(key);
    if (v) qs.set(key, v);
  }
  const r = await authorizedBackendJson<AdminAppUserPage>(
    `/api/v1/admin/users?${qs.toString()}`,
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Üyeler alınamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
