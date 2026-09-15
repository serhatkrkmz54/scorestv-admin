import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorOzetUretim } from "@/lib/types";

type Baglam = { params: Promise<{ macId: string }> };

/** Üretim durumu; sunucuda kayıt yoksa 204 → burada null. */
export async function GET(_req: NextRequest, { params }: Baglam) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { macId } = await params;
  const r = await teleskorJson<TeleskorOzetUretim | null>(
    `/api/v1/admin/mac-ozeti/${encodeURIComponent(macId)}/uretim`,
  );
  if (r.ok) return NextResponse.json(r.body ?? null);
  return teleskorResponse(r, "Üretim durumu alınamadı.");
}
