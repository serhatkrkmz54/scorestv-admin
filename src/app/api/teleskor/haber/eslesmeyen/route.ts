import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** İçe aktarmada eşleşmeyen bağlantılar — elle bağlanacaklar. */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const r = await teleskorJson(`/api/v1/admin/haber/eslesmeyen`);
  return teleskorResponse(r, "Liste alınamadı.");
}
