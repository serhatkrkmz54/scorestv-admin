import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** Başlık ve metni düzelt — sürüm ve görseller değişmiyor. */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await ctx.params;
  let govde: { baslik?: string; metin?: string };
  try {
    govde = (await req.json()) as { baslik?: string; metin?: string };
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await teleskorJson<unknown>(
    `/api/v1/admin/surum-notu/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        baslik: govde.baslik ?? "",
        metin: govde.metin ?? "",
      }),
    },
  );
  if (r.ok) return NextResponse.json({ ok: true });
  return teleskorResponse(r, "Sürüm notu düzeltilemedi.");
}

/**
 * Sil.
 *
 * <p>Görseller satırla birlikte gidiyor (CASCADE). Duyuru silinemiyor
 * çünkü o bir gönderim kaydı — "gitti mi?" sorusunun tek cevabı; sürüm
 * notu ise bir belge.
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { id } = await ctx.params;
  const r = await teleskorJson<unknown>(
    `/api/v1/admin/surum-notu/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (r.ok) return NextResponse.json({ ok: true });
  return teleskorResponse(r, "Sürüm notu silinemedi.");
}
