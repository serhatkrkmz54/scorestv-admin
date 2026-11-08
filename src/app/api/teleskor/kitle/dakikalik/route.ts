import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin } from "@/lib/teleskor-guard";

/** Bir günün dakika dakika online ölçümü (api-1 V82) — `?gun=YYYY-AA-GG`, boş = bugün. */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const gun = req.nextUrl.searchParams.get("gun") ?? "";
  if (gun && !/^\d{4}-\d{2}-\d{2}$/.test(gun)) {
    return NextResponse.json({ hata: "Geçersiz gün." }, { status: 400 });
  }
  const yanit = await teleskorJson<unknown>(
    `/api/v1/admin/kitle/dakikalik${gun ? `?gun=${gun}` : ""}`,
  );
  if (!yanit.ok) {
    return NextResponse.json(
      { hata: "Teleskor sunucusuna ulaşılamadı." },
      { status: 502 },
    );
  }
  return NextResponse.json(yanit.body);
}
