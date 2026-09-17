import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorNabizVideosu } from "@/lib/types";

type Baglam = { params: Promise<{ macId: string }> };

/**
 * Tek maçın NABIZ videosu: düzenle / sil (V65, 17 Eylül 2026).
 *
 * Gerçek özetin (`../route.ts`) ikizi; adres doğrulaması yine sunucuda
 * (aynı kural: https + izinli alan, iframe kabul). Panelde ikinci bir
 * kural yazılmıyor — ikisi zamanla ayrışırdı.
 */
export async function PUT(req: NextRequest, { params }: Baglam) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { macId } = await params;
  let govde: { adres?: string; baslik?: string; yayinda?: boolean };
  try {
    govde = (await req.json()) as typeof govde;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await teleskorJson<TeleskorNabizVideosu>(
    `/api/v1/admin/mac-ozeti/${encodeURIComponent(macId)}/nabiz`,
    {
      method: "PUT",
      body: JSON.stringify({
        adres: govde.adres,
        baslik: govde.baslik,
        yayinda: govde.yayinda,
      }),
    },
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Nabız videosu kaydedilemedi.");
}

export async function DELETE(req: NextRequest, { params }: Baglam) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { macId } = await params;
  const r = await teleskorJson<unknown>(
    `/api/v1/admin/mac-ozeti/${encodeURIComponent(macId)}/nabiz`,
    { method: "DELETE" },
  );
  if (r.ok) return new NextResponse(null, { status: 204 });
  return teleskorResponse(r, "Nabız videosu silinemedi.");
}
