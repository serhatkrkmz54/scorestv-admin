"use client";

/**
 * Yüklemeden ÖNCE tarayıcıda görsel küçültme.
 *
 * <p>Neden var: kapak görseli yolu (CoverUploader) dosyayı canvas ile
 * boyutlandırıp yüklüyordu, gövde görseli yolu (RichEditor) ham dosyayı
 * gönderiyordu. Telefondan gelen bir fotoğraf 3-8 MB; o dosya önce panelin
 * BFF'ine, oradan backend'e yükleniyor (iki ayaklı, sıralı) — yani "çok geç
 * yüklüyor" şikâyetinin en büyük kalemi ağda geçen süreydi. Aynı iş iki yerde
 * yapılmasın diye küçültme buraya, TEK yere alındı ve iki yol da buradan
 * geçiyor.
 *
 * <p>Kurallar (hepsi bir kayıp riskine karşı):
 * <ul>
 *   <li><b>GIF ve SVG'ye DOKUNULMAZ.</b> Canvas bir GIF'in yalnız İLK
 *       KARESİNİ çizer — animasyon geri getirilemez biçimde kaybolur; SVG'yi
 *       canvas'a çizmek onu rastere çevirir ve keskinliğini yok eder.</li>
 *   <li><b>PNG yalnız SAYDAMLIĞI VARSA PNG kalır.</b> Saydamlığı olan bir
 *       PNG'yi JPEG'e çevirmek şeffaf alanları SİYAH yapar — geri dönüşü yok.
 *       Ama saydamlık YOKSA (ekran görüntüsü, fotoğraf) PNG kötü bir
 *       sıkıştırıcı: aynı görsel JPEG'de kat kat küçük. O yüzden saydamlık
 *       tahmin edilmiyor, PİKSELDEN ÖLÇÜLÜYOR.</li>
 *   <li><b>Sonuç orijinalden büyükse ORİJİNAL gönderilir.</b> Küçük bir PNG'yi
 *       yeniden kodlamak onu büyütebiliyor; "hızlandırma" adına dosyayı
 *       büyütmek, düzeltmeye çalıştığımız sorunun kendisi olurdu.</li>
 *   <li><b>Zaten küçük dosyaya dokunulmaz.</b> Yeniden kodlama kayıplı bir
 *       işlem; kazancı olmayan yerde kaliteyi bedavaya vermiyoruz.</li>
 * </ul>
 */

/** Küçültme ayarları. Hepsi isteğe bağlı. */
export interface KucultmeAyari {
  /** Uzun kenar tavanı (px). Haber gövdesi için 1920 fazlasıyla yeterli. */
  enBuyukKenar?: number;
  /** JPEG kalitesi (0-1). PNG'de kullanılmaz — PNG kayıpsızdır. */
  kalite?: number;
  /**
   * Bu bayttan küçük VE tavana sığan dosyaya hiç dokunulmaz. Varsayılan
   * 320 KB: bu boyutta ağ süresi zaten fark etmez, yeniden kodlamanın
   * kayıplı olması ise gerçek bir bedel.
   */
  atlamaEsigi?: number;
}

/** Küçültme sonucu — çağıran "ne kadar kazandık" diyebilsin diye ölçüm taşır. */
export interface KucultmeSonucu {
  /** Yüklenecek dosya. Küçültme yapılmadıysa GELEN dosyanın kendisi. */
  dosya: File;
  /** Gerçekten yeniden kodlandı mı? */
  kucultuldu: boolean;
  /** Neden dokunulmadı (yalnız {@code kucultuldu === false} iken dolu). */
  sebep?: "kucuk" | "desteklenmiyor" | "buyudu" | "hata";
  oncekiBayt: number;
  sonrakiBayt: number;
}

/** Canvas'a çizilmesi KAYIPLI olan türler — bunlara hiç dokunulmuyor. */
const DOKUNULMAZ = new Set(["image/gif", "image/svg+xml", "image/apng"]);

/**
 * Dosyayı gerekiyorsa küçültür. Hata olursa ORİJİNALİ döndürür — küçültme bir
 * iyileştirme; başarısız olması yüklemeyi engellememeli.
 */
export async function kucult(
  dosya: File,
  ayar: KucultmeAyari = {},
): Promise<KucultmeSonucu> {
  const enBuyukKenar = ayar.enBuyukKenar ?? 1920;
  const kalite = ayar.kalite ?? 0.85;
  const atlamaEsigi = ayar.atlamaEsigi ?? 320 * 1024;
  const onceki = dosya.size;

  if (DOKUNULMAZ.has(dosya.type) || !dosya.type.startsWith("image/")) {
    return { dosya, kucultuldu: false, sebep: "desteklenmiyor", oncekiBayt: onceki, sonrakiBayt: onceki };
  }

  const url = URL.createObjectURL(dosya);
  try {
    const img = await gorseliYukle(url);
    const enBuyuk = Math.max(img.naturalWidth, img.naturalHeight);
    if (enBuyuk === 0) {
      return { dosya, kucultuldu: false, sebep: "hata", oncekiBayt: onceki, sonrakiBayt: onceki };
    }
    // Tavana sığıyor VE dosya küçük → yeniden kodlamanın kazancı yok.
    if (enBuyuk <= enBuyukKenar && onceki <= atlamaEsigi) {
      return { dosya, kucultuldu: false, sebep: "kucuk", oncekiBayt: onceki, sonrakiBayt: onceki };
    }

    const oran = Math.min(1, enBuyukKenar / enBuyuk);
    const g = Math.max(1, Math.round(img.naturalWidth * oran));
    const y = Math.max(1, Math.round(img.naturalHeight * oran));

    const canvas = document.createElement("canvas");
    canvas.width = g;
    canvas.height = y;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { dosya, kucultuldu: false, sebep: "hata", oncekiBayt: onceki, sonrakiBayt: onceki };
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, g, y);

    // PNG ise saydamlığı ÖLÇ. Kaynak yerel bir blob olduğu için canvas
    // "tainted" değil; getImageData okunabiliyor (kapak yolunda da böyle).
    const png = dosya.type.includes("png") && saydamMi(ctx, g, y);
    const blob = await new Promise<Blob | null>((cevap) =>
      canvas.toBlob((b) => cevap(b), png ? "image/png" : "image/jpeg", png ? undefined : kalite),
    );
    if (!blob) {
      return { dosya, kucultuldu: false, sebep: "hata", oncekiBayt: onceki, sonrakiBayt: onceki };
    }
    // Büyüdüyse orijinali gönder — bkz. sınıf başlığındaki üçüncü kural.
    if (blob.size >= onceki) {
      return { dosya, kucultuldu: false, sebep: "buyudu", oncekiBayt: onceki, sonrakiBayt: onceki };
    }

    const ad = yeniAd(dosya.name, png);
    const kucuk = new File([blob], ad, {
      type: png ? "image/png" : "image/jpeg",
      lastModified: Date.now(),
    });
    return { dosya: kucuk, kucultuldu: true, oncekiBayt: onceki, sonrakiBayt: kucuk.size };
  } catch {
    return { dosya, kucultuldu: false, sebep: "hata", oncekiBayt: onceki, sonrakiBayt: onceki };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Canvas'ta saydam (alfa &lt; 255) piksel var mı?
 *
 * <p>TEK bir saydam piksel bile JPEG'e çevirmeyi yasaklıyor, o yüzden
 * örnekleme YAPILMIYOR — bütün pikseller taranıyor. 1920×1080'de ~2 milyon
 * piksel; tarayıcıda milisaniyeler sürüyor ve karşılığı çoğu ekran
 * görüntüsünde kat kat küçük bir dosya.
 *
 * <p>Okuma başarısız olursa (bazı tarayıcılar bellek baskısında atıyor)
 * <b>"saydam" varsayılıyor</b>: yanılma yönü güvenli taraf — dosya PNG kalır,
 * yalnız daha büyük olur. Ters varsayım şeffaf alanları siyaha çevirirdi.
 */
function saydamMi(ctx: CanvasRenderingContext2D, g: number, y: number): boolean {
  try {
    const veri = ctx.getImageData(0, 0, g, y).data;
    for (let i = 3; i < veri.length; i += 4) {
      if (veri[i] < 255) return true;
    }
    return false;
  } catch {
    return true;
  }
}

/** Görsel URL'ini yükler (naturalWidth/Height için). */
function gorseliYukle(src: string): Promise<HTMLImageElement> {
  return new Promise((cevap, hata) => {
    const img = new Image();
    img.onload = () => cevap(img);
    img.onerror = () => hata(new Error("görsel okunamadı"));
    img.src = src;
  });
}

/**
 * Uzantıyı yeni türe göre düzeltir. Ad KORUNUR (medya kütüphanesinde
 * "image-1757.jpg" yerine "sahne-arkasi.jpg" görünsün); yalnız uzantı değişir,
 * çünkü JPEG'e dönen bir dosyanın adı .png kalırsa medya listesinde tür
 * yanlış görünür.
 */
function yeniAd(ad: string, png: boolean): string {
  const uzanti = png ? "png" : "jpg";
  const nokta = ad.lastIndexOf(".");
  const govde = nokta > 0 ? ad.slice(0, nokta) : ad;
  return `${govde || "gorsel"}.${uzanti}`;
}

/** İnsan okunur boyut ("1,4 MB"). Yalnız arayüz metni için. */
export function baytMetni(bayt: number): string {
  if (bayt < 1024) return `${bayt} B`;
  if (bayt < 1024 * 1024) return `${Math.round(bayt / 1024)} KB`;
  return `${(bayt / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
