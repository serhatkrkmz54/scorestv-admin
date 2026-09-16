import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorNabizVideosu } from "@/lib/types";

/** Nabız videosu durumları — kimlikler GÖVDEDE (özet toplu sorgusuyla aynı gerekçe: adres satırı sığmıyor). */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  let govde: { ids?: string[] };
  try {
    govde = (await req.json()) as typeof govde;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const ids = Array.isArray(govde.ids) ? govde.ids.map(String) : [];
  if (ids.length === 0) return NextResponse.json({});

  const r = await teleskorJson<Record<string, TeleskorNabizVideosu>>(
    "/api/v1/admin/mac-ozeti/nabiz/toplu",
    { method: "POST", body: JSON.stringify({ ids }) },
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Nabız videosu durumları alınamadı.");
}
