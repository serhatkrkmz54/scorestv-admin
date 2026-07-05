import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { NewsDetail } from "@/lib/types";

/** POST /api/v1/admin/news/{id}/publish — yayınla (EDITOR/ADMIN). */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  const { id } = await ctx.params;
  const r = await authorizedBackendJson<NewsDetail>(
    `/api/v1/admin/news/${encodeURIComponent(id)}/publish`,
    { method: "POST" },
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Haber yayınlanamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
