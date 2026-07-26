import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { AdminContribution } from "@/lib/types";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * Katkıyı onayla + Scores Puanı ver.
 * Backend: POST /api/v1/admin/contributions/{id}/approve
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const { id } = await ctx.params;

  let payload: { points?: number | null; note?: string | null } = {};
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    /* gövdesiz onay da geçerli */
  }

  const r = await authorizedBackendJson<AdminContribution>(
    `/api/v1/admin/contributions/${encodeURIComponent(id)}/approve`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Katkı onaylanamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
