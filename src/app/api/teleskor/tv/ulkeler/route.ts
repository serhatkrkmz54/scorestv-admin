import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TvUlke } from "@/lib/types";

/** TV KANALI DÜZELTME — TV listelerinde geçen ülkeler, en çok kullanılan önce. */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const r = await teleskorJson<TvUlke[]>("/api/v1/admin/engine/tv/ulkeler");
  return teleskorResponse(r, "Ülke listesi alınamadı.");
}
