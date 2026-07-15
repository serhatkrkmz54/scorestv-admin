import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { GrantCoinsResult } from "@/lib/types";

/** POST /api/v1/admin/game/users/{userId}/coins — coin ekle/çıkar (ADMIN). */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ userId: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  const { userId } = await ctx.params;
  let payload: { delta: number; reason?: string };
  try {
    payload = (await req.json()) as { delta: number; reason?: string };
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const r = await authorizedBackendJson<GrantCoinsResult>(
    `/api/v1/admin/game/users/${encodeURIComponent(userId)}/coins`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "İşlem başarısız." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
