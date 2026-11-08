import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin } from "@/lib/teleskor-guard";

/** KİTLE GÜN GÜN (api-1 V82) — `?gun=` son kaç gün (1-400). */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const ham = Number(req.nextUrl.searchParams.get("gun") ?? "30");
  const gun = Number.isInteger(ham) ? Math.min(400, Math.max(1, ham)) : 30;
  const yanit = await teleskorJson<unknown>(`/api/v1/admin/kitle/gunluk?gun=${gun}`);
  if (!yanit.ok) {
    return NextResponse.json(
      { hata: "Teleskor sunucusuna ulaşılamadı." },
      { status: 502 },
    );
  }
  return NextResponse.json(yanit.body);
}
