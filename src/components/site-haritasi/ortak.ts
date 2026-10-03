import { ApiError } from "@/lib/api-client";

/** Sitenin kökü — adresler buna eklenerek gösterilir. */
export const SITE = "https://www.teleskor.com.tr";

export const SIKLIKLAR: [string, string][] = [
  ["always", "Sürekli (always)"],
  ["hourly", "Saatlik (hourly)"],
  ["daily", "Günlük (daily)"],
  ["weekly", "Haftalık (weekly)"],
  ["monthly", "Aylık (monthly)"],
  ["yearly", "Yıllık (yearly)"],
  ["never", "Hiç (never)"],
];
export const SIKLIK_AD: Record<string, string> = Object.fromEntries(SIKLIKLAR);
export const ONCELIKLER = ["1.0", "0.9", "0.8", "0.7", "0.6", "0.5", "0.4", "0.3", "0.2", "0.1", "0.0"];

/** Tür kodu → ekrandaki ad (Teleskor'un listesiyle aynı; liste yüklenmeden de gösterilebilsin). */
export const TUR_AD: Record<string, string> = {
  genel: "Genel sayfalar",
  haber: "Son haberler",
  lig: "Ligler",
  takim: "Takımlar",
  oyuncu: "Oyuncular",
  mac: "Maçlar",
  td: "Teknik direktörler",
  hakem: "Hakemler",
};

export function tarih(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("tr-TR");
}

export function onceligiYaz(o: number | null | undefined): string {
  return o == null ? "" : o.toFixed(1);
}

export function hataMetni(e: unknown, varsayilan: string): string {
  return e instanceof ApiError ? e.message : varsayilan;
}

/**
 * Sitenin kendi adresini yola çevirir ("https://www.teleskor.com.tr/a" → "/a").
 * Başka alan adı null: haritaya yalnız sitenin kendi adresleri girer.
 */
export function yolaCevir(ham: string): string | null {
  const s = ham.trim();
  if (s.startsWith("/")) return s;
  const m = /^https?:\/\/(www\.)?teleskor\.com\.tr(\/.*)?$/i.exec(s);
  if (m) return m[2] || "/";
  return null;
}

/** Sunucuyla aynı kurallar: "/" ile başlar, boşluk, "?" ve "#" yok (adreste "*" de yok). */
export function yolHatasi(yol: string, kalip: boolean): string | null {
  if (!yol) return kalip ? "Kalıp boş olamaz." : "Adres boş olamaz.";
  if (!yol.startsWith("/")) return "Yol \"/\" ile başlamalı (sitenin kökünden).";
  if (yol.length > 500) return "En çok 500 karakter.";
  if (/\s/.test(yol)) return "Boşluk olamaz.";
  if (/[?#]/.test(yol)) return "\"?\" ve \"#\" kullanılamaz (yalnız sayfa yolu).";
  if (!kalip && yol.includes("*")) return "Adreste \"*\" olamaz (yalnız hariç kalıplarda).";
  if (kalip && /^\/\*+$/.test(yol)) return "\"/*\" bütün siteyi haritadan çıkarır; türü kapatın.";
  return null;
}

/** Web sitesindeki kuralın BİREBİR aynısı (teleskor-web `lib/kalip.ts`): "*" herhangi, gerisi tam eşleşme. */
export function kalipRegex(kalip: string): RegExp {
  return new RegExp(
    "^" + kalip.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$",
  );
}

/**
 * Adresin hangi harita türüne düştüğü — sitenin adres düzeniyle aynı
 * (teleskor-web `lib/slug.ts`, `lib/sitemap.ts`). Tanınmayan her şey "genel".
 */
export function adresTuru(yol: string): string {
  if (/^\/(futbol|basketbol)\/lig\//.test(yol) || /^(\/basketbol)?\/puan-durumu\/[^/]+-\d+/.test(yol)) return "lig";
  if (/^\/(futbol|basketbol)\/takim\//.test(yol)) return "takim";
  if (yol.startsWith("/oyuncu/")) return "oyuncu";
  if (yol.startsWith("/mac/")) return "mac";
  if (yol.startsWith("/teknik-direktor/")) return "td";
  if (yol.startsWith("/hakem/")) return "hakem";
  if (/^\/haber\/(?!kategori\/)[^/]+$/.test(yol)) return "haber";
  return "genel";
}
