import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { WidgetKullanimi } from "@/lib/types";

export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const ham = Number(req.nextUrl.searchParams.get("gun") ?? "30");
  const gun = Number.isFinite(ham) ? Math.min(90, Math.max(1, Math.trunc(ham))) : 30;
  const r = await teleskorJson<WidgetKullanimi>(`/api/v1/admin/widget-siteleri/kullanim?gun=${gun}`);
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Kullanım sayıları alınamadı.");
}
