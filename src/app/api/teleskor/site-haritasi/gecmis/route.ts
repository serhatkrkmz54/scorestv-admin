import type { NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorSiteHaritasi, teleskorResponse } from "@/lib/teleskor-guard";
import type { SiteHaritasiGecmis } from "@/lib/types";

/** Site haritası değişikliklerinin geçmişi (SEO rolü denetim kaydını göremez; bu yalnız kendi konusu). */
export async function GET(req: NextRequest) {
  const izin = await teleskorSiteHaritasi();
  if ("error" in izin) return izin.error;
  const sayfa = Math.max(0, Number.parseInt(req.nextUrl.searchParams.get("sayfa") ?? "0", 10) || 0);
  const r = await teleskorJson<SiteHaritasiGecmis>(`/api/v1/admin/site-haritasi/gecmis?sayfa=${sayfa}&boyut=30`);
  return teleskorResponse(r, "Geçmiş alınamadı.");
}
