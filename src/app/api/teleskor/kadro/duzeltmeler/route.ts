import { type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { KadroDuzeltme } from "@/lib/types";

/** KADRO MASASI — düzeltme defteri: açık olanlar ya da son 90 günde kapananlar. */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const lig = req.nextUrl.searchParams.get("lig");
  const kapali = req.nextUrl.searchParams.get("kapali") === "true";
  const ligParam = lig && /^\d+$/.test(lig) ? `&lig=${lig}` : "";
  const r = await teleskorJson<KadroDuzeltme[]>(
    `/api/v1/admin/engine/kadro/duzeltmeler?kapali=${kapali}${ligParam}`,
  );
  return teleskorResponse(r, "Düzeltme defteri alınamadı.");
}
