import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";

/** DELETE /api/v1/admin/game/duels/{duelId} — düello sil (ADMIN). */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ duelId: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  const { duelId } = await ctx.params;
  const r = await authorizedBackendJson(
    `/api/v1/admin/game/duels/${encodeURIComponent(duelId)}`,
    { method: "DELETE" },
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok) {
    return NextResponse.json(
      r.body ?? { message: "Düello silinemedi." },
      { status: r.status },
    );
  }
  return NextResponse.json({ ok: true });
}
