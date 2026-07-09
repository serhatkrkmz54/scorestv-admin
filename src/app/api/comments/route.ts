import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { AdminCommentPage } from "@/lib/types";

/** GET /api/v1/admin/comments — yorum moderasyon listesi (EDITOR/ADMIN). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const qs = new URLSearchParams();
  for (const key of ["sport", "deleted", "q", "page", "size"]) {
    const v = sp.get(key);
    if (v !== null && v !== "") qs.set(key, v);
  }
  const path = `/api/v1/admin/comments${qs.toString() ? `?${qs.toString()}` : ""}`;
  const r = await authorizedBackendJson<AdminCommentPage>(path);
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Yorumlar alınamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
