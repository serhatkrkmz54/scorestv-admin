import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";

/** POST /api/v1/admin/news/{id}/indexnow — bu haberi IndexNow'a bildir (ADMIN). */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  const { id } = await ctx.params;
  const r = await authorizedBackendJson<{ ok: boolean; url: string }>(
    `/api/v1/admin/news/${encodeURIComponent(id)}/indexnow`,
    { method: "POST" },
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "IndexNow bildirimi başarısız." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
