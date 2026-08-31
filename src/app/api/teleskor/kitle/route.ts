import { NextResponse } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin } from "@/lib/teleskor-guard";

/**
 * KİTLE — kaç kişi bağlı, kaç cihaz kayıtlı, kaç üye var.
 *
 * <p>Tek uç, tek gidiş-dönüş: backend sayıları zaten tek turda topluyor.
 * Sağlık sayfasındaki gibi paralel toplama gerekmiyor.
 */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const yanit = await teleskorJson<unknown>("/api/v1/admin/kitle");
  if (!yanit.ok) {
    return NextResponse.json(
      { hata: "Teleskor sunucusuna ulaşılamadı." },
      { status: 502 },
    );
  }
  return NextResponse.json(yanit.body);
}
