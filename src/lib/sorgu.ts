import "server-only";
import type { NextRequest } from "next/server";

/**
 * Panelden gelen sorgu dizesinden YALNIZ bilinen parametreleri Teleskor'a
 * geçirir (başkası sessizce düşer). Değerler yeniden kodlanır.
 */
export function izinliSorgu(req: NextRequest, anahtarlar: string[]): string {
  const sp = new URLSearchParams();
  for (const k of anahtarlar) {
    const v = req.nextUrl.searchParams.get(k);
    if (v != null && v !== "") sp.set(k, v.slice(0, 200));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
