import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorOzetUretim } from "@/lib/types";

type Baglam = { params: Promise<{ macId: string }> };

/** Özet videosunu sunucuda ÜRET (kuyruğa alır; 202). Durum: ../uretim */
export async function POST(req: NextRequest, { params }: Baglam) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { macId } = await params;
  const r = await teleskorJson<TeleskorOzetUretim>(
    `/api/v1/admin/mac-ozeti/${encodeURIComponent(macId)}/uret`,
    { method: "POST" },
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Özet üretimi başlatılamadı.");
}
