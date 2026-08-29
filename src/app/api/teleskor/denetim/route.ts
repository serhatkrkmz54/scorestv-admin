import { type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { DenetimSayfasi } from "@/lib/types";

/**
 * Denetim kayıtları — süzülerek listeleme.
 *
 * <p>Bu ucun kendisi de denetim kaydına yazılıyor (AUDIT_LOG_VIEWED):
 * "denetimin denetimi". Panelin bu sayfayı her açışı bir satır bırakıyor.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const sp = req.nextUrl.searchParams;
  const q = new URLSearchParams();
  for (const anahtar of ["userId", "event", "ip", "from", "to"]) {
    const deger = sp.get(anahtar);
    if (deger) q.set(anahtar, deger);
  }
  q.set("page", sp.get("page") ?? "0");
  q.set("size", sp.get("size") ?? "50");

  const r = await teleskorJson<DenetimSayfasi>(
    `/api/v1/admin/audit?${q.toString()}`,
  );
  return teleskorResponse(r, "Denetim kayıtları alınamadı.");
}
