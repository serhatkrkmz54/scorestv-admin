import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { AdminUserView } from "@/lib/types";

/**
 * PATCH /api/v1/admin/users/{id}/enabled — hesabı etkinleştir/pasifleştir
 * (yalnız ADMIN). Body: { enabled: boolean }. Backend kendi hesabını devre dışı
 * bırakmayı 400 ile reddeder.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  const { id } = await ctx.params;
  let payload: { enabled?: boolean };
  try {
    payload = (await req.json()) as { enabled?: boolean };
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await authorizedBackendJson<AdminUserView>(
    `/api/v1/admin/staff/${encodeURIComponent(id)}/enabled`,
    { method: "PATCH", body: JSON.stringify({ enabled: payload.enabled }) },
  );

  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Durum değiştirilemedi." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
