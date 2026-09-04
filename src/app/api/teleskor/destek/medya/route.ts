import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorDosya } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * DESTEK CEVABINA EK — dosyayı Teleskor'a yükler, kimliğini döndürür.
 *
 * <h3>İki adım, tek istek DEĞİL</h3>
 * Dosya ÖNCE yükleniyor, cevap SONRA yazılıyor (kullanıcı tarafındaki
 * sözleşmenin aynısı). Tek istekte gitseydi 50 MB'lık bir video
 * yüklenirken ağ koptuğunda YAZILAN METİN de kaybolurdu.
 *
 * <h3>Dosyanın sahibi panelin hizmet hesabı</h3>
 * Yükleme Teleskor'un normal medya hattından geçiyor
 * ({@code /api/v1/me/medya}) ve satırın sahibi hizmet hesabı oluyor;
 * cevap da aynı hesapla yazıldığı için iliştirme sahiplik denetiminden
 * geçiyor. Ayrı bir "yönetici medyası" yolu açılmadı: o hat EXIF
 * temizliği, içerik imzası denetimi, sıkıştırma bombası koruması,
 * ffmpeg dönüşümü ve öksüz toplama işlerini zaten çözmüş durumda.
 *
 * <h3>SAATLİK KOTA ORTAK — bilinen sınır</h3>
 * Teleskor yükleme kotasını KULLANICI başına sayıyor (saatte 20) ve
 * panelin tamamı tek hizmet hesabı kullanıyor. Yani kota, destek
 * ekibinin toplamı için geçerli. Bugünkü hacimde sorun değil; darlık
 * yaşanırsa Teleskor tarafında kotayı role göre ayırmak gerekir.
 */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ message: "Dosya okunamadı." }, { status: 400 });
  }
  const dosya = form.get("file");
  if (!(dosya instanceof File) || dosya.size === 0) {
    return NextResponse.json({ message: "Dosya seçilmedi." }, { status: 400 });
  }

  // TÜRE GÖRE UÇ — Teleskor'da fotoğraf ve video AYRI uçlarda ve bu
  // bilinçli: sınırları (5 MB / 50 MB), hata mesajları ve işleme hattı
  // farklı. Tek uç olsaydı 50 MB'lık tavan fotoğrafa da açılmış olurdu.
  const video = dosya.type.startsWith("video/");
  const yol = video ? "/api/v1/me/medya-video" : "/api/v1/me/medya";

  const ileri = new FormData();
  ileri.append("file", dosya, dosya.name || (video ? "video.mp4" : "gorsel.jpg"));

  const r = await teleskorDosya<Record<string, unknown>>(yol, ileri);
  return teleskorResponse(r, "Dosya yüklenemedi.");
}
