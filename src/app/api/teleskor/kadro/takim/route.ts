import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { KadroTakimKadrosu } from "@/lib/types";

/** KADRO MASASI — takımın bütün kadro adayları, kararları ve nedenleriyle. */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const takim = req.nextUrl.searchParams.get("takim");
  if (!takim || !/^\d+$/.test(takim)) {
    return NextResponse.json({ message: "Takım seçilmedi." }, { status: 400 });
  }
  const r = await teleskorJson<KadroTakimKadrosu>(
    `/api/v1/admin/engine/kadro/takim?takim=${takim}`,
  );
  return teleskorResponse(r, "Kadro alınamadı.");
}
