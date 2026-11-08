import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** Google Play kurulum raporunu şimdi oku (api-1 V83; normalde 6 saatte bir). */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const r = await teleskorJson<unknown>("/api/v1/admin/kitle/dis/play/tazele", { method: "POST" });
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Play raporu okunamadı.");
}
