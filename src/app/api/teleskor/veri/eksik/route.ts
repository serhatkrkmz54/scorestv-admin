import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TakimEksigi } from "@/lib/types";

/** Ligin takımları, eksikleriyle — "neyi doldurmam gerekiyor" listesi. */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const lig = req.nextUrl.searchParams.get("lig");
  if (!lig || !/^\d+$/.test(lig)) {
    return NextResponse.json({ message: "Lig seçilmedi." }, { status: 400 });
  }

  const r = await teleskorJson<TakimEksigi[]>(
    `/api/v1/admin/engine/veri/eksik?lig=${lig}`,
  );
  return teleskorResponse(r, "Eksik raporu alınamadı.");
}
