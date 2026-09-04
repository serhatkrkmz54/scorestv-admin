import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { YayinTanisi } from "@/lib/types";

/**
 * YAYIN TANISI — "şalteri açtım ama düğme çıkmadı".
 *
 * <h3>Neden panelde gerekiyordu</h3>
 * Uygulamadaki yayın düğmesinin çıkmaması için beş ayrı sebep var ve beşi
 * de istemciye aynı sessiz 404 olarak görünüyor. Bu uç sunucu tarafında
 * hangi kapının kapandığını söylüyor; panele bağlanana kadar tek çağırma
 * yolu elle {@code curl} idi.
 *
 * <h3>Maç kimliği İSTEĞE BAĞLI ve anlamı değişiyor</h3>
 * Parametresiz çağrı yalnız AYAR durumunu denetliyor (şalter, şablon,
 * token); {@code ?mac=} verilince o maça özgü üç kapıyı da (motorun
 * bayrağı, lig engeli, sağlayıcıda gerçekten akış var mı) sınıyor.
 * İkisini ayrı uçlara bölmek, aynı karar yolunun iki kopyası demekti.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  // Yalnız SAYI geçiyor: Teleskor tarafı zaten Long bekliyor, ama serbest
  // metni oraya taşımanın hiçbir faydası yok.
  const ham = req.nextUrl.searchParams.get("mac");
  const mac = ham && /^\d+$/.test(ham) ? ham : null;

  const r = await teleskorJson<YayinTanisi>(
    mac ? `/api/v1/admin/yayin/tani?mac=${mac}` : "/api/v1/admin/yayin/tani",
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Yayın tanısı alınamadı.");
}
