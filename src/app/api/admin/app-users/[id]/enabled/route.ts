import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { AdminAppUser } from "@/lib/types";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * Üye etkin/pasif değiştir. Pasife alınca backend tüm oturumları da iptal eder.
 * Backend: PATCH /api/v1/admin/users/{id}/enabled
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const { id } = await ctx.params;

  let payload: { enabled: boolean };
  try {
    payload = (await req.json()) as { enabled: boolean };
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await authorizedBackendJson<AdminAppUser>(
    `/api/v1/admin/users/${encodeURIComponent(id)}/enabled`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Durum güncellenemedi." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
