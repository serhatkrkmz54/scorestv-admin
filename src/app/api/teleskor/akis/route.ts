import { type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorAkisSikayeti } from "@/lib/types";

/** Bekleyen akış şikayetleri — gönderinin ve yorumun metniyle birlikte. */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const limit = req.nextUrl.searchParams.get("limit") ?? "100";
  const r = await teleskorJson<TeleskorAkisSikayeti[]>(
    `/api/v1/admin/akis/sikayetler?limit=${encodeURIComponent(limit)}`,
  );
  return teleskorResponse(r, "Şikayetler alınamadı.");
}
