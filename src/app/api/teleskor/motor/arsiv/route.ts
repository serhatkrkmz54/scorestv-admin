import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const r = await teleskorJson("/api/v1/admin/engine/motor/arsiv");
  return teleskorResponse(r, "Arşiv durumu alınamadı.");
}

/** islem: "yukle" (1,8 GB, saatler sürer) | "durdur" */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  let payload: { islem?: string } = {};
  try {
    payload = (await req.json()) as { islem?: string };
  } catch {
    /* gövdesiz gelebilir */
  }
  const yol =
    payload.islem === "durdur" ? "durdur" : payload.islem === "yukle" ? "yukle" : null;
  if (!yol) {
    return NextResponse.json({ message: "Bilinmeyen işlem." }, { status: 400 });
  }

  const r = await teleskorJson(`/api/v1/admin/engine/motor/arsiv/${yol}`, {
    method: "POST",
  });
  if (r.ok) return NextResponse.json(r.body ?? { ok: true });
  return teleskorResponse(r, "İşlem başarısız.");
}
