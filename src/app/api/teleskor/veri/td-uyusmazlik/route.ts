import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { VeriTdUyusmazlik } from "@/lib/types";

/** Ligin takımları: sayfadaki teknik direktör ile son 3 maçın kulübesi (motor V107). */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const lig = req.nextUrl.searchParams.get("lig") ?? "";
  if (!/^\d{1,18}$/.test(lig)) {
    return NextResponse.json({ message: "Geçersiz lig." }, { status: 400 });
  }
  const r = await teleskorJson<VeriTdUyusmazlik[]>(`/api/v1/admin/engine/veri/td-uyusmazlik?lig=${lig}`);
  return teleskorResponse(r, "Teknik direktör listesi alınamadı.");
}
