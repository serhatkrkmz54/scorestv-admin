"use client";

/**
 * Yapıştırılan video adresini çözer.
 *
 * <p><b>Kural: GÖMME KODU DEĞİL ADRES.</b> Yönetici en doğal olarak
 * YouTube'un "Paylaş → Yerleştir" kutusundaki tam {@code <iframe …>} bloğunu
 * yapıştırıyor. O bloğu olduğu gibi editöre koymak, yöneticinin yazdığı
 * HTML'i okuyucunun tarayıcısında ÇALIŞAN kod yapmak olurdu. Burada yalnız
 * {@code src} değeri alınıyor; çerçeveyi editörün kendi eklentisi kuruyor.
 * Aynı karar Teleskor'da maç özeti adresi için de verilmişti.
 *
 * <p>Üç kapı, üçü de ayrı sebeple:
 * <ol>
 *   <li><b>{@code https} zorunlu</b> — {@code http} bir gömme çerçevesinde
 *       karışık içerik olarak engellenip SESSİZCE boş kutu bırakıyor.
 *       Reddedip söylemek, okuyucuya boş kutu göstermekten iyi.</li>
 *   <li><b>Alan adı izinli listede</b> — yöneticiye güvenilmediği için değil,
 *       tek bir yazım hatasının okuyucuyu tanımadığımız bir sayfaya
 *       götürmemesi için.</li>
 *   <li><b>İzleme parametreleri düşüyor</b> — özellikle {@code list=}:
 *       taşınsaydı oynatıcı BAŞKA bir videoya gidebilirdi. Yalnız
 *       {@code start}/{@code t} korunuyor (özet videosunda sık kullanılıyor).
 *       YouTube'da bu işi editörün eklentisi zaten yapıyor, burada yalnız
 *       adres temizlenip veriliyor.</li>
 * </ol>
 */

/** Çözüm sonucu. */
export type VideoCozum =
  | { tur: "youtube"; adres: string }
  /** Tanınan ama editörün bugün gömemediği platform — kullanıcıya söylenecek. */
  | { tur: "desteklenmiyor"; platform: string; adres: string }
  | { tur: "yok"; sebep: "bos" | "http" | "adres-degil" | "taninmayan-alan" };

/** YouTube'un kabul ettiği alan adları (editörün eklentisi bunları gömüyor). */
const YOUTUBE = ["youtube.com", "youtu.be", "youtube-nocookie.com"];

/**
 * Video barındıran ama şu an gömülemeyen tanıdık platformlar. Amaç kullanıcıya
 * "adresi yanlış yazdım mı?" diye düşündürmemek: bu listede olan bir adres
 * için mesaj "bu platform henüz desteklenmiyor" diyor.
 */
const TANIDIK: Record<string, string> = {
  "x.com": "X (Twitter)",
  "twitter.com": "X (Twitter)",
  "vimeo.com": "Vimeo",
  "dailymotion.com": "Dailymotion",
  "dai.ly": "Dailymotion",
  "streamable.com": "Streamable",
  "instagram.com": "Instagram",
  "tiktok.com": "TikTok",
  "facebook.com": "Facebook",
  "fb.watch": "Facebook",
};

/** Adresten silinecek izleme/oturum parametreleri. */
const IZLEME = new Set(["si", "feature", "pp", "list", "index", "ab_channel", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"]);

/**
 * Ham metni (URL ya da tam {@code <iframe>} bloğu) çözer.
 *
 * <p>Metnin İÇİNDE geçen adresi aramaz — yalnız metnin TAMAMI bir adres (ya da
 * bir iframe bloğu) ise çözer. Aksi hâlde bir paragrafın ortasındaki bağlantı
 * yazı yazarken aniden videoya dönüşürdü.
 */
export function videoCoz(ham: string): VideoCozum {
  const metin = (ham ?? "").trim();
  if (!metin) return { tur: "yok", sebep: "bos" };

  const adayHam = ifadedenSrc(metin) ?? metin;
  // Yapıştırılan HTML'de "&amp;" olarak gelir; çözülmezse parametreler bozulur.
  const aday = adayHam.replace(/&amp;/g, "&");

  if (/\s/.test(aday)) return { tur: "yok", sebep: "adres-degil" };

  let u: URL;
  try {
    u = new URL(aday.startsWith("//") ? `https:${aday}` : aday);
  } catch {
    return { tur: "yok", sebep: "adres-degil" };
  }
  if (u.protocol === "http:") return { tur: "yok", sebep: "http" };
  if (u.protocol !== "https:") return { tur: "yok", sebep: "adres-degil" };

  // İzleme parametrelerini at (start/t korunuyor).
  for (const anahtar of [...u.searchParams.keys()]) {
    if (IZLEME.has(anahtar)) u.searchParams.delete(anahtar);
  }

  if (alanUyuyor(u.hostname, YOUTUBE)) {
    return { tur: "youtube", adres: u.toString() };
  }
  for (const [alan, ad] of Object.entries(TANIDIK)) {
    if (alanUyuyor(u.hostname, [alan])) {
      return { tur: "desteklenmiyor", platform: ad, adres: u.toString() };
    }
  }
  return { tur: "yok", sebep: "taninmayan-alan" };
}

/**
 * Alt alan adı kontrolü NOKTAYLA. Düz {@code endsWith} olsaydı
 * {@code kotuyoutube.com} da geçerdi ve izinli liste hiçbir işe yaramazdı.
 */
function alanUyuyor(host: string, alanlar: string[]): boolean {
  const h = host.toLowerCase();
  return alanlar.some((a) => h === a || h.endsWith(`.${a}`));
}

/** Tam bir {@code <iframe …>} bloğu yapıştırıldıysa yalnız src değerini alır. */
function ifadedenSrc(metin: string): string | null {
  if (!/^<iframe[\s>]/i.test(metin)) return null;
  const m = metin.match(/\ssrc\s*=\s*["']([^"']+)["']/i);
  return m ? m[1].trim() : null;
}
