// Backend enum'ları için Türkçe etiketler + sabit seçenek listeleri.
import type { NewsCategory, NewsStatus } from "./types";

export const STATUS_LABELS: Record<NewsStatus, string> = {
  DRAFT: "Taslak",
  SCHEDULED: "Zamanlanmış",
  PUBLISHED: "Yayında",
  ARCHIVED: "Arşiv",
};

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  TRANSFER: "Transfer",
  MATCH: "Maç",
  INJURY: "Sakatlık",
  INTERVIEW: "Röportaj",
  PREVIEW: "Maç Önü",
  RESULT: "Sonuç",
  GENERAL: "Genel",
};

export const CATEGORY_OPTIONS: NewsCategory[] = [
  "TRANSFER",
  "MATCH",
  "INJURY",
  "INTERVIEW",
  "PREVIEW",
  "RESULT",
  "GENERAL",
];

export const STATUS_OPTIONS: NewsStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
];

// Backend sport alanı serbest metin (max 16). Panelde sabit bir liste sunuyoruz.
export const SPORT_OPTIONS: { value: string; label: string }[] = [
  { value: "football", label: "Futbol" },
  { value: "basketball", label: "Basketbol" },
  { value: "volleyball", label: "Voleybol" },
  { value: "news", label: "Haber" },
];

export const SPORT_LABELS: Record<string, string> = Object.fromEntries(
  SPORT_OPTIONS.map((s) => [s.value, s.label]),
);

export const LANG_LABELS: Record<string, string> = {
  tr: "TR",
  en: "EN",
};

export function statusLabel(s: NewsStatus | null | undefined): string {
  return s ? STATUS_LABELS[s] ?? s : "-";
}

export function categoryLabel(c: NewsCategory | null | undefined): string {
  return c ? CATEGORY_LABELS[c] ?? c : "-";
}

export function sportLabel(s: string | null | undefined): string {
  if (!s) return "-";
  return SPORT_LABELS[s] ?? s;
}
