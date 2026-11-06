import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** OYUNCU DÜZENLEME — sakatlık türleri (sakat, cezalı, ...). */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const r = await teleskorJson<unknown>("/api/v1/admin/engine/oyuncu-duzeltme/sakatlik-turleri");
  return teleskorResponse(r, "Sakatlık türleri alınamadı.");
}
