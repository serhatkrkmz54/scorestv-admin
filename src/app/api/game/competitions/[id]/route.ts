import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { GameCompetitionView } from "@/lib/types";

/** GET /api/v1/admin/game/competitions/{id} — yarışma + düellolar (ADMIN). */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const r = await authorizedBackendJson<GameCompetitionView>(
    `/api/v1/admin/game/competitions/${encodeURIComponent(id)}`,
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Yarışma alınamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}

/** DELETE /api/v1/admin/game/competitions/{id} (ADMIN). */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  const { id } = await ctx.params;
  const r = await authorizedBackendJson(
    `/api/v1/admin/game/competitions/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok) {
    return NextResponse.json(
      r.body ?? { message: "Yarışma silinemedi." },
      { status: r.status },
    );
  }
  return NextResponse.json({ ok: true });
}
