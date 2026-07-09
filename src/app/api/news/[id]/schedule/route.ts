import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { NewsDetail, RescheduleRequest } from "@/lib/types";

/** PATCH /api/v1/admin/news/{id}/schedule — yeniden zamanla (EDITOR/ADMIN). */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  const { id } = await ctx.params;
  let payload: RescheduleRequest;
  try {
    payload = (await req.json()) as RescheduleRequest;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const r = await authorizedBackendJson<NewsDetail>(
    `/api/v1/admin/news/${encodeURIComponent(id)}/schedule`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Yeniden zamanlanamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
