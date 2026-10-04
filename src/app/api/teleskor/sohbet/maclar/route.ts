import { type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import { izinliSorgu } from "@/lib/sorgu";
import type { TeleskorSohbetMacListesi } from "@/lib/types";

/** Sohbeti olan maçlar (en son yazılan önce, imleçli). Yalnız bilinen parametreler geçer. */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const sorgu = izinliSorgu(req, ["once", "onceMac", "limit", "sikayetli"]);
  const r = await teleskorJson<TeleskorSohbetMacListesi>(`/api/v1/admin/chat/maclar${sorgu}`);
  return teleskorResponse(r, "Maç sohbetleri alınamadı.");
}
