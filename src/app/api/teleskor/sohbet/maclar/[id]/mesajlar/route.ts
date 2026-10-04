import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import { izinliSorgu } from "@/lib/sorgu";
import type { TeleskorSohbetMesajSayfasi } from "@/lib/types";

/** Maçın mesajları (arama, silinenler, üye süzgeci; imleçli). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const { id } = await ctx.params;
  if (!/^\d{1,18}$/.test(id)) return NextResponse.json({ message: "Geçersiz maç." }, { status: 400 });
  const sorgu = izinliSorgu(req, ["silinen", "oncesi", "limit", "q", "kullaniciId"]);
  const r = await teleskorJson<TeleskorSohbetMesajSayfasi>(`/api/v1/admin/chat/maclar/${id}/mesajlar${sorgu}`);
  return teleskorResponse(r, "Mesajlar alınamadı.");
}
