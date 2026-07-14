import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { ContactPage } from "@/lib/types";

/** GET /api/v1/admin/contact — iletişim mesajları (ADMIN). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const qs = new URLSearchParams();
  for (const key of ["status", "page", "size"]) {
    const v = sp.get(key);
    if (v !== null && v !== "") qs.set(key, v);
  }
  const path = `/api/v1/admin/contact${qs.toString() ? `?${qs.toString()}` : ""}`;
  const r = await authorizedBackendJson<ContactPage>(path);
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Mesajlar alınamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
