import "server-only";

export { robotsIzni } from "./robots-kurali";

/**
 * SİTEYİ DIŞARIDAN OKUMA — Site Haritası ekranının "inceleme" araçları için
 * (3 Ekim). Panel sunucusu sitenin herkese açık adreslerini arama motoru gibi
 * okur: harita dosyaları, robots.txt, tek bir sayfa.
 *
 * <p>YALNIZ bu site: adres her zaman {@link WEB} kökünden kurulur, çağıranın
 * verdiği alan adı kullanılmaz (panel başka bir sunucuya istek atan bir araca
 * dönüşmesin). Yönlendirme elle izlenir ve yalnız aynı siteye gidilir.
 */
export const WEB = (process.env.TELESKOR_WEB_URL || "https://www.teleskor.com.tr").replace(/\/+$/, "");

/** Ekranda gösterilen kök (yerelde WEB başka olsa da adresler sitenin adıyla görünür). */
export const SITE_ADI = "https://www.teleskor.com.tr";

/** Panelin kendi tanıtımı: sitenin log'unda arama motoru sanılmasın. */
const AJAN = "TeleskorPanel/1.0 (site-haritasi-denetimi)";

/**
 * Kullanıcının yazdığı adresi sitenin yoluna çevirir. Tam adres yalnız
 * teleskor.com.tr (www'lü/www'süz) olabilir; başka alan adı null.
 */
export function yolaCevir(ham: string): string | null {
  const s = ham.trim();
  if (!s) return null;
  let yol: string;
  if (s.startsWith("/")) yol = s;
  else {
    const m = /^https?:\/\/(www\.)?teleskor\.com\.tr(\/[^#]*)?$/i.exec(s);
    if (!m) return null;
    yol = m[2] || "/";
  }
  yol = yol.replace(/#.*$/, "");
  if (yol.length > 1000 || /[\s<>"\\]/.test(yol) || yol.startsWith("//")) return null;
  return yol;
}

export async function webGetir(
  yol: string,
  secenek: { yonlendirme?: "manual" | "follow"; zamanAsimi?: number } = {},
): Promise<Response> {
  return fetch(WEB + yol, {
    redirect: secenek.yonlendirme ?? "follow",
    cache: "no-store",
    headers: { "User-Agent": AJAN, Accept: "text/html,application/xml;q=0.9,*/*;q=0.8" },
    signal: AbortSignal.timeout(secenek.zamanAsimi ?? 15000),
  });
}

/** XML'den etiket değerleri (harita dosyaları basit ve bizim üretimimiz; tam ayrıştırıcı gereksiz). */
export function etiketler(xml: string, ad: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${ad}>([\\s\\S]*?)</${ad}>`, "g");
  for (let m = re.exec(xml); m; m = re.exec(xml)) out.push(xmlCoz(m[1].trim()));
  return out;
}

export function xmlCoz(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Sitenin adresini ekranda sitenin adıyla göster (yerelde WEB farklı olabilir). */
export function siteAdresi(adres: string): string {
  return adres.startsWith(WEB) ? SITE_ADI + adres.slice(WEB.length) : adres;
}
