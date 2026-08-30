import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorAktor, teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { SozlesmeMetni } from "@/lib/types";

/**
 * SÖZLEŞME METİNLERİ.
 *
 * <p>Listeleme HERKESE AÇIK bir uçtan geliyor ({@code /legal/documents}) —
 * uygulamanın da okuduğu yer. Yayınlama ise ADMIN.
 */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const r = await teleskorJson<SozlesmeMetni[]>("/api/v1/legal/documents");
  return teleskorResponse(r, "Metinler alınamadı.");
}

export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const aktor = teleskorAktor(izin.user.displayName || izin.user.email);
  const r = await teleskorJson<SozlesmeMetni>("/api/v1/admin/legal/documents", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      reason: `${String(payload.reason ?? "").trim()} [panel: ${aktor}]`.trim(),
    }),
  });
  return teleskorResponse(r, "Sürüm yayınlanamadı.", 201);
}
