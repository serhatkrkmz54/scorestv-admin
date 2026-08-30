import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * KİMLİK ARAMA — iki yön tek uçta.
 *
 * <p>{@code saglayici=} verilirse sağlayıcı kimliğinden bize;
 * {@code tur=&id=} verilirse bizden sağlayıcıya. Ayrı rotalar olsaydı
 * ekran hangisini çağıracağına karar vermek için aynı koşulu ikinci kez
 * yazardı.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const sp = req.nextUrl.searchParams;
  const saglayici = sp.get("saglayici");
  const tur = sp.get("tur");
  const id = sp.get("id");

  const yol = saglayici
    ? `/api/v1/admin/engine/motor/kimlik/saglayici/${encodeURIComponent(saglayici)}`
    : tur && id
      ? `/api/v1/admin/engine/motor/kimlik/bizim/${encodeURIComponent(tur)}/${encodeURIComponent(id)}`
      : null;
  if (!yol) {
    return NextResponse.json(
      { message: "Sağlayıcı kimliği ya da tür + kimlik gerekli." },
      { status: 400 },
    );
  }

  const r = await teleskorJson(yol);
  return teleskorResponse(r, "Kimlik aranamadı.");
}
