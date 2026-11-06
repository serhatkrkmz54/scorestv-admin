import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** OYUNCU DÜZENLEME — elle girilebilen sezon istatistiği kalemleri. */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const r = await teleskorJson<unknown>("/api/v1/admin/engine/oyuncu-duzeltme/sezon-kalemleri");
  return teleskorResponse(r, "İstatistik kalemleri alınamadı.");
}
