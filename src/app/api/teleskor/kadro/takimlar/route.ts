import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { KadroTakimOzeti } from "@/lib/types";

/**
 * KADRO MASASI — ligin takımları, kadro sayılarıyla.
 *
 * <p>Zincir: panel → teleskor-backend → sports-engine (motor V105). Kural ve
 * sayılar motorda; burada yalnız geçiş.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const lig = req.nextUrl.searchParams.get("lig");
  if (!lig || !/^\d+$/.test(lig)) {
    return NextResponse.json({ message: "Lig seçilmedi." }, { status: 400 });
  }
  const r = await teleskorJson<KadroTakimOzeti[]>(
    `/api/v1/admin/engine/kadro/takimlar?lig=${lig}`,
  );
  return teleskorResponse(r, "Takım listesi alınamadı.");
}
