import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { CreateDuelRequest } from "@/lib/types";

/** POST /api/v1/admin/game/competitions/{id}/duels — düello ekle (ADMIN). */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  const { id } = await ctx.params;
  let payload: CreateDuelRequest;
  try {
    payload = (await req.json()) as CreateDuelRequest;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await authorizedBackendJson(
    `/api/v1/admin/game/competitions/${encodeURIComponent(id)}/duels`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok) {
    return NextResponse.json(
      r.body ?? { message: "Düello eklenemedi." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body ?? { ok: true }, { status: 201 });
}
