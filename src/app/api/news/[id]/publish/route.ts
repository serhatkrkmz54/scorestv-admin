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
  // Push niyeti query param olarak backend'e iletilir: ?sendPush=true&pushTarget=
  // Verilmezse backend push göndermez.
  const sp = req.nextUrl.searchParams;
  const qs = new URLSearchParams();
  if (sp.get("sendPush") === "true") qs.set("sendPush", "true");
  const pushTarget = sp.get("pushTarget");
  if (pushTarget) qs.set("pushTarget", pushTarget);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const r = await authorizedBackendJson<NewsDetail>(
    `/api/v1/admin/news/${encodeURIComponent(id)}/publish${suffix}`,
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
