import "server-only";
import { NextResponse } from "next/server";
import { resolveUserAllowRefresh } from "./auth-server";
import { teleskorConfigured, type TeleskorResult } from "./teleskor";
import type { AppUser } from "./types";

/**
 * TELESKOR ROTALARININ TEK KAPISI.
 *
 * <p>Teleskor tarafındaki hizmet hesabı her zaman ADMIN olduğu için yetki
 * kontrolünün TAMAMI burada. Her rotada elle yazılsaydı biri er geç
 * unutulurdu ve EDITOR rolündeki bir editör Teleskor'un marketini
 * yönetebilirdi — hiçbir yerde hata patlamadan. ({@code /game} rotalarında
 * bu risk yok: orada ScoresTV backend'i isteği atan kişinin kendi rolüne
 * bakıyor.)
 *
 * @returns yetki varsa kullanıcı, yoksa döndürülecek hata yanıtı
 */
export async function teleskorAdmin(): Promise<
  { user: AppUser } | { error: NextResponse }
> {
  const user = await resolveUserAllowRefresh();
  if (!user) {
    return {
      error: NextResponse.json({ message: "Oturum gerekli." }, { status: 401 }),
    };
  }
  if (user.role !== "ADMIN") {
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
        {
          message:
            "Teleskor bağlantısı kurulu değil. Sunucuda TELESKOR_BACKEND_URL, " +
            "TELESKOR_ADMIN_USER ve TELESKOR_ADMIN_PASSWORD tanımlanmalı.",
        },
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
  //   body === null -> İSTEĞİN KENDİSİ başarısız (teleskorJson bağlanamadı
  //                    ya da hizmet hesabıyla giriş yapamadı) — kendi
  //                    ürettiğimiz durum, gövdesi yok.
  //   body dolu     -> Teleskor CEVAP VERDİ ve içinde açıklama var
  //                    (ör. "Motor, yönetim anahtarını reddetti").
  //
  // Ayrım olmadan ikinci durum birincinin metniyle örtülüyordu ve
  // kullanıcı yanlış yere bakıyordu. Aynı hata 403'te de yapılmıştı.
  if ((r.status === 502 || r.status === 503) && r.body == null) {
    return NextResponse.json(
      {
        message:
          "Teleskor sunucusuna ulaşılamıyor ya da hizmet hesabıyla giriş " +
          "yapılamadı. Kimlik bilgilerini ve adresi kontrol et.",
      },
      { status: 503 },
    );
  }
  // 403 ARTIK TEK ANLAMLI. Eskiden motorun 403'ü de buraya düşüyordu ve
  // "hizmet hesabı ADMIN değil" diye görünüyordu — hesap ADMIN'di, sorun
  // motorun anahtarıydı. Backend o durumu artık 502 ile ayırıyor
  // (MotorCeviriVekili), yani buraya gelen 403 gerçekten rol sorunudur.
  if (r.status === 403) {
    // Teleskor'un "Bu işlem için yetkiniz yok" mesajı burada YETMİYOR:
    // panele giren kişi zaten ADMIN (guard onu geçirdi), yetkisi olmayan
    // HİZMET HESABI. Mesaj olduğu gibi geçseydi kullanıcı kendi rolünü
    // sorgulardı ve yanlış yerde ararrdı.
    return NextResponse.json(
      {
        message:
          "Teleskor, panelin hizmet hesabını yetkisiz buldu. O hesap " +
          "Teleskor tarafında ADMIN rolüne yükseltilmiş olmalı: " +
          "UPDATE users SET role='ADMIN' WHERE username='…';",
      },
      { status: 403 },
    );
  }
  // Teleskor'un kendi Türkçe mesajı varsa OLDUĞU GİBİ geçiyor: panelde
  // ikinci bir metin yazmak, iki yerde ayrışan iki açıklama üretirdi.
  return NextResponse.json(r.body ?? { message: hataMesaji }, {
    status: r.status,
  });
}
