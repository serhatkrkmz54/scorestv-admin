import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { DenetimZinciri } from "@/lib/types";

/**
 * Zincir bütünlüğü — kayıtlar sonradan değiştirilmiş mi?
 *
 * <p>Her kayıt bir öncekinin SHA-256 özetini taşıyor. Bu uç zinciri baştan
 * sona doğruluyor; {@code intact: false} kurcalama demek.
 */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const r = await teleskorJson<DenetimZinciri>("/api/v1/admin/audit/verify");
  return teleskorResponse(r, "Zincir doğrulanamadı.");
}
