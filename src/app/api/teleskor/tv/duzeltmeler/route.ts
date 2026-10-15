import { type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TvDefterSatiri } from "@/lib/types";

/** TV KANALI DÜZELTME — elle eklenenler: açık olanlar ya da son 90 günde kaldırılanlar. */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const kaldirilan = req.nextUrl.searchParams.get("kaldirilan") === "true";
  const r = await teleskorJson<TvDefterSatiri[]>(
    `/api/v1/admin/engine/tv/duzeltmeler?kaldirilan=${kaldirilan}`,
  );
  return teleskorResponse(r, "Kayıtlar alınamadı.");
}
