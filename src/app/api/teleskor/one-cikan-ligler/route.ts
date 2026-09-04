import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { OneCikanLigYaniti, OneCikanLigIstegi } from "@/lib/types";

/** Spor değeri sunucuya OLDUĞU GİBİ gitmesin: yalnız iki değer geçerli. */
function spor(req: NextRequest): string {
  const ham = req.nextUrl.searchParams.get("spor");
  return ham === "BASKETBALL" ? "BASKETBALL" : "FOOTBALL";
}

/**
 * ÖNE ÇIKAN LİGLER — anasayfanın üst bloğu.
 *
 * <p>Liste bugüne kadar api-1'in {@code .env}'indeydi: bir lig eklemek ya
 * da sırayı değiştirmek servisi yeniden başlatmak demekti. Artık panelde.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const r = await teleskorJson<OneCikanLigYaniti>(
    `/api/v1/admin/one-cikan-ligler?spor=${spor(req)}`,
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Öne çıkan lig listesi alınamadı.");
}

/**
 * Listeyi BÜTÜN olarak yazar.
 *
 * <p>Parçalı uçlar (ekle/çıkar/taşı) olsaydı iki yönetici aynı anda
 * düzenlediğinde sıra numaraları çakışırdı. Panel listeyi zaten elinde
 * tutuyor; tek istekte göndermek hem basit hem her zaman tutarlı.
 */
export async function PUT(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  let payload: OneCikanLigIstegi;
  try {
    payload = (await req.json()) as OneCikanLigIstegi;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  // KİM YAPTI gerekçeye ekleniyor: Teleskor isteği tek bir servis hesabıyla
  // görüyor, gerçek yöneticiyi ancak buradan öğrenebiliyor. Bu metin
  // kullanıcıya gösterilmiyor, yalnız denetim kaydına giriyor.
  const aktor = (izin.user.displayName || izin.user.email || "panel").trim();
  const r = await teleskorJson<OneCikanLigYaniti>(
    "/api/v1/admin/one-cikan-ligler",
    {
      method: "PUT",
      body: JSON.stringify({
        spor: payload.spor,
        ligler: payload.ligler,
        reason: `${(payload.reason ?? "").trim()} [panel: ${aktor}]`.trim(),
      }),
    },
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Liste kaydedilemedi.");
}
