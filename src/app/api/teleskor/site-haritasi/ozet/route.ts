import { NextResponse } from "next/server";
import { backendJson } from "@/lib/backend";
import { etiketler, SITE_ADI, webGetir } from "@/lib/site-web";
import { teleskorSiteHaritasi } from "@/lib/teleskor-guard";
import type { SiteHaritasiOzeti } from "@/lib/types";

/** Harita türü → dizindeki dosya adresinin başı (web'in dosya adlarıyla aynı). */
const TUR_DOSYA: [string, string][] = [
  ["genel", "/sitemap-genel.xml"],
  ["haber", "/haber/sitemap-haber.xml"],
  ["lig", "/lig/sitemap/"],
  ["takim", "/takim/sitemap/"],
  ["oyuncu", "/oyuncu/sitemap/"],
  ["mac", "/mac/sitemap/"],
  ["td", "/teknik-direktor/sitemap/"],
  ["hakem", "/hakem/sitemap/"],
];

/** Kayıt sayısı: sitenin de okuduğu herkese açık besleme (lig/takım iki spor, gerisi futbol). */
const KAYIT_SPORLARI: Record<string, string[]> = {
  lig: ["FOOTBALL", "BASKETBALL"],
  takim: ["FOOTBALL", "BASKETBALL"],
  oyuncu: ["FOOTBALL"],
  td: ["FOOTBALL"],
  hakem: ["FOOTBALL"],
};

async function adresSayisi(yol: string): Promise<number | null> {
  try {
    const y = await webGetir(yol);
    if (!y.ok) return null;
    return ((await y.text()).match(/<url>/g) ?? []).length;
  } catch {
    return null;
  }
}

async function kayitSayisi(tur: string): Promise<number | null> {
  const sporlar = KAYIT_SPORLARI[tur];
  if (!sporlar) return null;
  const sonuclar = await Promise.all(
    sporlar.map((s) => backendJson<{ toplam?: number }>(`/api/v1/catalog/sitemap/${tur}?parca=0&sport=${s}`)),
  );
  if (sonuclar.some((r) => !r.ok || typeof r.body?.toplam !== "number")) return null;
  return sonuclar.reduce((t, r) => t + (r.body?.toplam ?? 0), 0);
}

function bugunTr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

/**
 * Haritanın CANLI özeti: dizindeki dosya sayıları (siteden), kayıt sayıları
 * (sitenin de okuduğu besleme), tek dosyalı türlerde adres sayısı. Panel
 * sunucusu siteyi arama motoru gibi okur; ayar değil, gözlem.
 */
export async function GET() {
  const izin = await teleskorSiteHaritasi();
  if ("error" in izin) return izin.error;

  let dizin: string[] = [];
  let hata: string | undefined;
  try {
    const y = await webGetir("/sitemap.xml");
    if (y.ok) dizin = etiketler(await y.text(), "loc").map((l) => (l.startsWith(SITE_ADI) ? l.slice(SITE_ADI.length) : l));
    else hata = `Site haritası dizini okunamadı (${y.status}).`;
  } catch {
    hata = "Siteye ulaşılamadı; sayılar eksik.";
  }

  const gun = bugunTr();
  const turler = await Promise.all(
    TUR_DOSYA.map(async ([tur, onek]) => {
      const dosya = dizin.filter((d) => (onek.endsWith("/") ? d.startsWith(onek) : d === onek)).length;
      let adres: number | null = null;
      let not: string | undefined;
      if ((tur === "genel" || tur === "haber") && dosya > 0) adres = await adresSayisi(onek);
      if (tur === "mac" && dosya > 0) {
        const [f, b] = await Promise.all([
          adresSayisi(`/mac/sitemap/futbol-${gun}.xml`),
          adresSayisi(`/mac/sitemap/basketbol-${gun}.xml`),
        ]);
        adres = f == null && b == null ? null : (f ?? 0) + (b ?? 0);
        not = "adres sayısı yalnız bugünün maçları";
      }
      return { tur, dosya, kayit: dosya > 0 ? await kayitSayisi(tur) : null, adres, not };
    }),
  );
  const ozet: SiteHaritasiOzeti = { turler, toplamDosya: dizin.length, ...(hata ? { hata } : {}) };
  return NextResponse.json(ozet);
}
