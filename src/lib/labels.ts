// Backend enum'ları için Türkçe etiketler + sabit seçenek listeleri.
import type { NewsCategory, NewsStatus } from "./types";

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

