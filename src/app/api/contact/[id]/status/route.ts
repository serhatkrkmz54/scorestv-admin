import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { ContactMessageView } from "@/lib/types";

/** PATCH /api/v1/admin/contact/{id}/status — durum güncelle (ADMIN). */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  const { id } = await ctx.params;
  let payload: { status: string };
  try {
    payload = (await req.json()) as { status: string };
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const r = await authorizedBackendJson<ContactMessageView>(
    `/api/v1/admin/contact/${encodeURIComponent(id)}/status`,
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
