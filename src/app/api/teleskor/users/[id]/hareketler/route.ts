import { type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { DenetimSayfasi } from "@/lib/types";

/**
 * Üyenin hareket geçmişi: o hesapla ilgili denetim kayıtları, en yeni önce.
 * Görüntüleme satırları gizli (geçmiş kendi izleriyle dolmasın); ilk
 * sayfanın açılması denetime "üye kartında hareket geçmişi açıldı" yazar.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const q = new URLSearchParams({
    page: sp.get("page") ?? "0",
    size: sp.get("size") ?? "20",
    goruntulemeleriGizle: "true",
  });
  const r = await teleskorJson<DenetimSayfasi>(
    `/api/v1/admin/audit/user/${encodeURIComponent(id)}?${q.toString()}`,
  );
  return teleskorResponse(r, "Hareket geçmişi alınamadı.");
}
