import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** İç notu siler (yumuşak); gerekçeye yöneticinin adı eklenir (status rotasıyla aynı). */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; notId: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const { id, notId } = await ctx.params;
  let payload: { reason?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const aktor = (izin.user.displayName || izin.user.email || "panel").trim();
  const r = await teleskorJson(
    `/api/v1/admin/users/${encodeURIComponent(id)}/notlar/${encodeURIComponent(notId)}/sil`,
    {
      method: "POST",
      body: JSON.stringify({
        reason: `${(payload.reason ?? "").trim()} [panel: ${aktor}]`.trim(),
      }),
    },
  );
  if (r.ok) return NextResponse.json({ ok: true });
  return teleskorResponse(r, "Not silinemedi.");
}
