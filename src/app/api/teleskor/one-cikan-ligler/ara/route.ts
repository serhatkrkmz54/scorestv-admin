import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { OneCikanLigAramaSatiri } from "@/lib/types";

/**
 * Lig arama — listeye eklenecek ligi bulmak için.
 *
 * <p>Sonuçta ligin SAĞLAYICI kimliği de dönüyor; saklanan değer o.
 * Motorun iç kimliği kullanılsaydı motorun veritabanı yeniden
 * kurulduğunda liste sessizce başka bir ligi gösterirdi.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    // Sunucu da iki harften kısa aramada boş dönüyor; burada durmak
    // gereksiz bir gidiş-dönüşü hiç yapmıyor.
    return NextResponse.json([]);
  }
  const sporDegeri =
    req.nextUrl.searchParams.get("spor") === "BASKETBALL"
      ? "BASKETBALL"
      : "FOOTBALL";

  const r = await teleskorJson<OneCikanLigAramaSatiri[]>(
    `/api/v1/admin/one-cikan-ligler/ara?spor=${sporDegeri}&q=${encodeURIComponent(q)}`,
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Lig araması yapılamadı.");
}
