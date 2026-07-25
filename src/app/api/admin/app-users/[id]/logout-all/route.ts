import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * Üyenin tüm oturumlarını sonlandır (refresh token'lar iptal).
 * Backend: POST /api/v1/admin/users/{id}/logout-all
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const { id } = await ctx.params;

  const r = await authorizedBackendJson<{ userId: number; revokedSessions: number }>(
    `/api/v1/admin/users/${encodeURIComponent(id)}/logout-all`,
    { method: "POST" },
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Oturumlar sonlandırılamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
