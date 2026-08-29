import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorAktor, teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorMarketOrder, TeleskorOrderStatus } from "@/lib/types";

/**
 * Sipariş durumu — İPTAL puanı ve stoğu geri verir (yalnız bir kez).
 *
 * <h3>Editörün adı nota EKLENİYOR</h3>
 * Teleskor'un denetim kaydı bu işlemi hizmet hesabı üzerinde görüyor;
 * "kim iptal etti" sorusu orada cevapsız kalırdı. Yönetici notunun sonuna
 * paneldeki kişinin GÖRÜNEN ADI ekleniyor — e-posta değil, çünkü bu not
 * kullanıcıya da gösteriliyor.
 */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await ctx.params;
  let payload: { durum: TeleskorOrderStatus; yoneticiNotu?: string | null };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const aktor = teleskorAktor(izin.user.displayName);
  const not = (payload.yoneticiNotu ?? "").trim();
  const govde = {
    durum: payload.durum,
    // Not boşsa da imza gidiyor: iptalde kullanıcı en azından işlemin
    // elle yapıldığını görüyor. Not doluysa imza sonuna ekleniyor.
    yoneticiNotu: not ? `${not}  — ${aktor}` : `İşlem: ${aktor}`,
  };

  const r = await teleskorJson<TeleskorMarketOrder>(
    `/api/v1/admin/market/siparisler/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(govde) },
  );
  return teleskorResponse(r, "Sipariş güncellenemedi.");
}
