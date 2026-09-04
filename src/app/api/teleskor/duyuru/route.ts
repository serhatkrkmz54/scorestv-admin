import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { DuyuruKaydi, DuyuruIstegi } from "@/lib/types";

/**
 * DUYURU — geçmiş liste.
 *
 * <p>Panelin bu sayfayı açar açmaz göstermesi gereken şey "ne gönderdim":
 * duyuru geri alınamıyor ve aynı şeyi ikinci kez göndermenin tek koruması
 * bu liste.
 */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const r = await teleskorJson<DuyuruKaydi[]>("/api/v1/admin/duyuru?limit=50");
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Duyurular alınamadı.");
}

/**
 * DUYURU GÖNDER.
 *
 * <h3>Panelin en yıkıcı düğmesi</h3>
 * Diğer yönetim işlemleri tek bir kaydı değiştiriyor ve geri alınabiliyor;
 * bu, yüz binlerce telefonda bildirim çıkarıyor ve geri alınamıyor.
 *
 * <h3>HEDEF KİTLE GÖNDERİLMİYOR — bilerek</h3>
 * Gövdede "kime" diye bir alan yok: kitleyi sunucu TÜRDEN belirliyor.
 * Panelden seçilebilseydi "kampanyayı herkese gönder" tek tık olurdu ve
 * 6563'ün koruduğu şey bir arayüz tercihine bırakılmış olurdu.
 */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  let payload: DuyuruIstegi;
  try {
    payload = (await req.json()) as DuyuruIstegi;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await teleskorJson<{ id: number }>("/api/v1/admin/duyuru", {
    method: "POST",
    body: JSON.stringify({
      tur: payload.tur,
      baslik: payload.baslik,
      metin: payload.metin,
      hedefYol: payload.hedefYol ?? null,
    }),
  });
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Duyuru gönderilemedi.");
}
