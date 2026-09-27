import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** Yayındaki haberin adresini arama motorlarına yeniden bildir (IndexNow). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) return NextResponse.json({ message: "Geçersiz haber." }, { status: 400 });
  const r = await teleskorJson(`/api/v1/admin/haber/${id}/indexnow`, { method: "POST" });
  return teleskorResponse(r, "Bildirilemedi.");
}
