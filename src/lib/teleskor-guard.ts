import "server-only";
import { NextResponse } from "next/server";
import { resolveUserAllowRefresh } from "./auth-server";
import { teleskorConfigured, type TeleskorResult } from "./teleskor";
import type { AppUser, Role } from "./types";

/**
 * TELESKOR ROTALARININ KAPISI.
 *
 * <p>Asıl yetki kontrolü Teleskor'da (istek yöneticinin kendi token'ıyla
 * gidiyor, uçlar `hasRole('ADMIN')`). Buradaki kontrol erken ve anlaşılır
 * bir cevap için: oturumu düşmüş kullanıcı 401'i Teleskor'un iç metniyle
 * değil panelin cümlesiyle görsün.
 *
 * @returns yetki varsa kullanıcı, yoksa döndürülecek hata yanıtı
 */
export async function teleskorAdmin(): Promise<
  { user: AppUser } | { error: NextResponse }
> {
  return teleskorRol(["ADMIN"]);
}

/**
 * Site Haritası rotalarının kapısı: ADMIN ya da SEO (Teleskor'da da bu uçlar
 * `hasAnyRole('ADMIN','SEO')`). Başka hiçbir rota SEO'ya açık değil.
 */
export async function teleskorSiteHaritasi(): Promise<
  { user: AppUser } | { error: NextResponse }
> {
  return teleskorRol(["ADMIN", "SEO"]);
}

async function teleskorRol(
  roller: Role[],
): Promise<{ user: AppUser } | { error: NextResponse }> {
  const user = await resolveUserAllowRefresh();
  if (!user) {
    return {
      error: NextResponse.json({ message: "Oturum gerekli." }, { status: 401 }),
    };
  }
  if (!roller.includes(user.role)) {
    return {
      error: NextResponse.json(
        { message: "Bu işlem yalnız yöneticilere (ADMIN) açıktır." },
        { status: 403 },
      ),
    };
  }
  if (!teleskorConfigured()) {
    return {
      error: NextResponse.json(
        { message: "Teleskor bağlantısı kurulu değil. Sunucuda TELESKOR_BACKEND_URL tanımlanmalı." },
        { status: 503 },
      ),
    };
  }
  return { user };
}

/** Teleskor yanıtını panelin yanıtına çevirir; hata metinleri Türkçe geliyor. */
export function teleskorResponse<T>(
  r: TeleskorResult<T>,
  hataMesaji: string,
  basariliDurum = 200,
): NextResponse {
  if (r.ok) {
    return NextResponse.json(r.body ?? {}, { status: basariliDurum });
  }
  // 502/503 İKİ AYRI ŞEY OLABİLİR ve gövde bunu ayırıyor:
  //
  //   body === null -> İSTEĞİN KENDİSİ başarısız (Teleskor'a bağlanılamadı)
  //                    — kendi ürettiğimiz durum, gövdesi yok.
  //   body dolu     -> Teleskor CEVAP VERDİ ve içinde açıklama var
  //                    (ör. "Motor, yönetim anahtarını reddetti").
  //
  // Ayrım olmadan ikinci durum birincinin metniyle örtülüyordu ve
  // kullanıcı yanlış yere bakıyordu. Aynı hata 403'te de yapılmıştı.
  if ((r.status === 502 || r.status === 503) && r.body == null) {
    return NextResponse.json(
      { message: "Teleskor sunucusuna ulaşılamıyor. Biraz sonra yeniden dene." },
      { status: 503 },
    );
  }
  if (r.status === 403 && r.body == null) {
    return NextResponse.json(
      { message: "Bu işlem için Teleskor'da yönetici (ADMIN) yetkisi gerekli." },
      { status: 403 },
    );
  }
  // Teleskor'un kendi Türkçe mesajı varsa OLDUĞU GİBİ geçiyor: panelde
  // ikinci bir metin yazmak, iki yerde ayrışan iki açıklama üretirdi.
  return NextResponse.json(r.body ?? { message: hataMesaji }, {
    status: r.status,
  });
}
