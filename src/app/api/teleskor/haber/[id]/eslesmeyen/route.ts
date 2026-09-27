import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** Eşleşmeyen bağlantıyı listeden kaldır (elle bağlandı ya da gerek yok). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const { id } = await params;
  const tur = req.nextUrl.searchParams.get("tur") ?? "";
  const eskiId = req.nextUrl.searchParams.get("eskiId") ?? "";
  if (!/^\d{1,12}$/.test(id) || !/^(TAKIM|LIG|OYUNCU)$/.test(tur) || !/^\d{1,12}$/.test(eskiId)) {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const r = await teleskorJson(`/api/v1/admin/haber/${id}/eslesmeyen?tur=${tur}&eskiId=${eskiId}`, {
    method: "DELETE",
  });
  return teleskorResponse(r, "Kaldırılamadı.");
}
