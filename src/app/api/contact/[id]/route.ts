import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";

/** DELETE /api/v1/admin/contact/{id} — mesajı sil (ADMIN). */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  const { id } = await ctx.params;
  const r = await authorizedBackendJson(
    `/api/v1/admin/contact/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok) {
    return NextResponse.json(
      r.body ?? { message: "Mesaj silinemedi." },
      { status: r.status },
    );
  }
  return NextResponse.json({ ok: true });
}
