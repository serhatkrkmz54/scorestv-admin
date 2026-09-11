import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { VeriAlani } from "@/lib/types";

/** Yamalanabilir alanların beyaz listesi — panel girdi kutularını buradan çiziyor. */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const r = await teleskorJson<VeriAlani[]>("/api/v1/admin/engine/veri/alanlar");
  return teleskorResponse(r, "Alan listesi alınamadı.");
}
