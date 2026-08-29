import { type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorSohbetSikayeti } from "@/lib/types";

/** Bekleyen sohbet şikayetleri (mesaj gövdesiyle birlikte). */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const limit = req.nextUrl.searchParams.get("limit") ?? "100";
  const r = await teleskorJson<TeleskorSohbetSikayeti[]>(
    `/api/v1/admin/chat/reports?limit=${encodeURIComponent(limit)}`,
  );
  return teleskorResponse(r, "Şikayetler alınamadı.");
}
