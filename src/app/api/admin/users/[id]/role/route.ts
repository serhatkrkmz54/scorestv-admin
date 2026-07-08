import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { AdminUserView } from "@/lib/types";

/**
 * PATCH /api/v1/admin/users/{id}/role — rol değiştir (yalnız ADMIN).
 * Body: { role: "EDITOR" | "ADMIN" }. Backend kendi rolünü değiştirmeyi 400 ile
 * reddeder.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  const { id } = await ctx.params;
  let payload: { role?: string };
  try {
    payload = (await req.json()) as { role?: string };
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await authorizedBackendJson<AdminUserView>(
    `/api/v1/admin/staff/${encodeURIComponent(id)}/role`,
    { method: "PATCH", body: JSON.stringify({ role: payload.role }) },
  );

  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Rol değiştirilemedi." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
