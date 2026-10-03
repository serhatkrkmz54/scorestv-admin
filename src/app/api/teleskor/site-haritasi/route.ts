import { teleskorJson } from "@/lib/teleskor";
import { teleskorSiteHaritasi, teleskorResponse } from "@/lib/teleskor-guard";
import type { SiteHaritasiAyarlari } from "@/lib/types";

/** Site haritası ayarları (ADMIN ve SEO): türler, ek adresler, hariç kalıplar. */
export async function GET() {
  const izin = await teleskorSiteHaritasi();
  if ("error" in izin) return izin.error;
  const r = await teleskorJson<SiteHaritasiAyarlari>("/api/v1/admin/site-haritasi");
  return teleskorResponse(r, "Site haritası ayarları alınamadı.");
}
