import { type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorMarketOrder } from "@/lib/types";

/**
 * Teleskor Telepuan Marketi — siparişler.
 * Teleskor backend: GET /api/v1/admin/market/siparisler?durum=&kullanici=&limit=
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const durum = req.nextUrl.searchParams.get("durum") ?? "";
  const kullanici = req.nextUrl.searchParams.get("kullanici") ?? "";
  const limit = req.nextUrl.searchParams.get("limit") ?? "100";

  const q = new URLSearchParams();
  if (durum) q.set("durum", durum);
  if (kullanici) q.set("kullanici", kullanici);
  q.set("limit", limit);

  const r = await teleskorJson<TeleskorMarketOrder[]>(
    `/api/v1/admin/market/siparisler?${q.toString()}`,
  );
  return teleskorResponse(r, "Siparişler alınamadı.");
}
