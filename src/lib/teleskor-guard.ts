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
  if (r.status === 502 || r.status === 503) {
    return NextResponse.json(
      {
        message:
          "Teleskor sunucusuna ulaşılamıyor ya da hizmet hesabıyla giriş " +
          "yapılamadı. Kimlik bilgilerini ve adresi kontrol et.",
      },
      { status: 503 },
    );
  }
  // Teleskor'un kendi Türkçe mesajı varsa OLDUĞU GİBİ geçiyor: panelde
  // ikinci bir metin yazmak, iki yerde ayrışan iki açıklama üretirdi.
  return NextResponse.json(r.body ?? { message: hataMesaji }, {
    status: r.status,
  });
}
