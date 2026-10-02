import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorUyeNotu } from "@/lib/types";

/** Üyenin iç notları (yalnız panel görür): liste ve yeni not. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const { id } = await ctx.params;
  const r = await teleskorJson<TeleskorUyeNotu[]>(
    `/api/v1/admin/users/${encodeURIComponent(id)}/notlar`,
  );
  return teleskorResponse(r, "Notlar alınamadı.");
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const { id } = await ctx.params;
  let payload: { metin?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const r = await teleskorJson<TeleskorUyeNotu>(
    `/api/v1/admin/users/${encodeURIComponent(id)}/notlar`,
    { method: "POST", body: JSON.stringify({ metin: payload.metin ?? "" }) },
  );
  return teleskorResponse(r, "Not kaydedilemedi.");
}
