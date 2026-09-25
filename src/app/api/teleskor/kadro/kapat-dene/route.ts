import { type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** KADRO MASASI — kural yetiştiği için gereksizleşen düzeltmeleri şimdi kapatır. */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const r = await teleskorJson<{ kapanan: number }>(
    "/api/v1/admin/engine/kadro/kapat-dene",
    { method: "POST" },
  );
  return teleskorResponse(r, "Kapatma çalıştırılamadı.");
}
