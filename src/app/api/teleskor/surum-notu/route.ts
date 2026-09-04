import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { SurumNotu, SurumNotuIstegi } from "@/lib/types";

/**
 * SÜRÜM NOTLARI — liste.
 *
 * <p>Yayınlanmamış (ileri tarihli) notlar da geliyor: yönetici
 * yazdığını görebilmeli, yoksa "kaydettim ama kayboldu" derdi.
 */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const r = await teleskorJson<SurumNotu[]>("/api/v1/admin/surum-notu?limit=50");
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Sürüm notları alınamadı.");
}

/**
 * SÜRÜM NOTU YAZ.
 *
 * <h3>Duyurudan farkı: BİLDİRİM GİTMİYOR</h3>
 * Bu düğme kimsenin telefonunu titretmiyor; notu Gelen Kutusu'na
 * koyuyor. Her yayında bildirim atmak, kullanıcının bildirimleri
 * tümden kapatmasının en hızlı yolu olurdu. Duyurulmak isteniyorsa
 * Duyurular sayfasından ayrıca bir DUYURU gönderiliyor.
 */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  let payload: SurumNotuIstegi;
  try {
    payload = (await req.json()) as SurumNotuIstegi;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await teleskorJson<{ id: number }>("/api/v1/admin/surum-notu", {
    method: "POST",
    body: JSON.stringify({
      surum: payload.surum,
      baslik: payload.baslik,
      metin: payload.metin,
      minSurum: payload.minSurum ?? null,
      yayinAt: payload.yayinAt ?? null,
      medyaIdler: Array.isArray(payload.medyaIdler)
        ? payload.medyaIdler.filter((x) => Number.isInteger(x))
        : [],
    }),
  });
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Sürüm notu kaydedilemedi.");
}
