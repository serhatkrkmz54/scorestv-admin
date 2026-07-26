import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { AdminReporterApplication } from "@/lib/types";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** Başvuruyu reddet. Backend: POST /api/v1/admin/reporter/applications/{id}/reject */
export async function POST(req: NextRequest, ctx: Ctx) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const { id } = await ctx.params;

  let payload: { note?: string | null } = {};
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    /* gövdesiz red geçerli */
  }

  const r = await authorizedBackendJson<AdminReporterApplication>(
    `/api/v1/admin/reporter/applications/${encodeURIComponent(id)}/reject`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Reddedilemedi." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
