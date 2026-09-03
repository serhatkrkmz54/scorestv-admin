import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorDestekYazismasi } from "@/lib/types";

/**
 * Cevap yaz — kullanıcı bunu UYGULAMADAN okuyor ve bildirim alıyor.
 *
 * Eskiden bu iş bir `mailto:` bağlantısıydı: cevap yöneticinin kendi posta
 * programından gidiyor, hiçbir yerde saklanmıyordu.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await ctx.params;
  let govde: { metin?: string };
  try {
    govde = (await req.json()) as { metin?: string };
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const metin = (govde.metin ?? "").trim();
  if (!metin) {
    return NextResponse.json({ message: "Cevap boş olamaz." }, { status: 400 });
  }

  const r = await teleskorJson<TeleskorDestekYazismasi>(
    `/api/v1/admin/destek/${encodeURIComponent(id)}/cevap`,
    { method: "POST", body: JSON.stringify({ metin }) },
  );
  return teleskorResponse(r, "Cevap gönderilemedi.");
}
