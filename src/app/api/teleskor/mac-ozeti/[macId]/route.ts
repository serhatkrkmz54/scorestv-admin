import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorMacOzeti } from "@/lib/types";

type Baglam = { params: Promise<{ macId: string }> };

/**
 * Tek maçın özeti: yaz / sil.
 *
 * <h3>Adres DOĞRULANMADAN gönderiliyor — bilerek</h3>
 * Yapıştırılan metin (bağlantı ya da tam {@code <iframe>} bloğu) olduğu
 * gibi Teleskor'a gidiyor; gömme adresine çevirme ve izinli alan adı
 * denetimi ORADA. Panelde ikinci bir kural yazılsaydı ikisi zamanla
 * ayrışır ve panel, sunucunun kabul edeceği bir adresi reddetmeye
 * (ya da tersi) başlardı. Kural tek yerde, hata mesajı da oradan geliyor.
 */
export async function PUT(req: NextRequest, { params }: Baglam) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { macId } = await params;
  let govde: { adres?: string; baslik?: string; yayinda?: boolean };
  try {
    govde = (await req.json()) as typeof govde;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await teleskorJson<TeleskorMacOzeti>(
    `/api/v1/admin/mac-ozeti/${encodeURIComponent(macId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        adres: govde.adres,
        baslik: govde.baslik,
        yayinda: govde.yayinda,
      }),
    },
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Özet kaydedilemedi.");
}

export async function DELETE(req: NextRequest, { params }: Baglam) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { macId } = await params;
  const r = await teleskorJson<unknown>(
    `/api/v1/admin/mac-ozeti/${encodeURIComponent(macId)}`,
    { method: "DELETE" },
  );
  if (r.ok) return new NextResponse(null, { status: 204 });
  return teleskorResponse(r, "Özet silinemedi.");
}
