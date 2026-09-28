import "server-only";
import { authorizedBackendForm, authorizedBackendJson } from "./auth-server";

/**
 * TELESKOR YÖNETİM İSTEKLERİ — girişi yapan yöneticinin KENDİ oturumuyla.
 *
 * <h3>28 Eylül 2026: hizmet hesabı kalktı</h3>
 * Panel eskiden ScoresTV'nin backend'inde oturum açıyor, Teleskor'a tek bir
 * hizmet hesabıyla (TELESKOR_ADMIN_USER/PASSWORD) gidiyordu. Sonuçları:
 * Teleskor'un denetim zinciri bütün işlemleri TEK hesap adına görüyordu
 * ("market ürününü kim ekledi" sorusunun cevabı hep aynıydı) ve yetkinin
 * tamamı panelin rol kontrolündeydi. Panel Teleskor'a taşınınca giriş de
 * Teleskor hesaplarıyla: her istek o yöneticinin token'ıyla gidiyor, yetkiyi
 * Teleskor kendisi denetliyor (`hasRole('ADMIN')`), denetim kaydı gerçek
 * kişiyi yazıyor.
 */

export interface TeleskorResult<T = unknown> {
  ok: boolean;
  status: number;
  body: T | null;
  /** Adres tanımlı değil (env eksik) — 503'ten ayırt edilebilmesi için. */
  notConfigured?: boolean;
}

/** Teleskor adresi ortamda tanımlı mı? (Yerel varsayılana güvenilmez.) */
export function teleskorConfigured(): boolean {
  return !!(process.env.TELESKOR_BACKEND_URL || process.env.BACKEND_URL);
}

const OTURUM_BITTI = {
  message: "Oturumun süresi doldu. Sayfayı yenileyip yeniden giriş yap.",
};

/** Teleskor'a kimlikli JSON isteği (401'de bir kez yenileyip yeniden dener). */
export async function teleskorJson<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<TeleskorResult<T>> {
  const r = await authorizedBackendJson<T>(path, init);
  if (r.unauthorized) {
    return { ok: false, status: 401, body: OTURUM_BITTI as unknown as T };
  }
  return { ok: r.ok, status: r.status, body: r.body };
}

/**
 * DOSYA YÜKLEME — Teleskor'a multipart istek.
 *
 * {@link teleskorJson} her isteğe `Content-Type: application/json` koyuyor;
 * multipart'ta bu başlık EL İLE yazılamaz (sınır dizesini fetch üretiyor).
 * Elle yazılan başlık o sınırı taşımaz, sunucu gövdeyi ayrıştıramaz ve 400
 * döner — sebebi hiçbir yerde görünmez.
 */
export async function teleskorDosya<T = unknown>(
  path: string,
  form: FormData,
): Promise<TeleskorResult<T>> {
  const { res, unauthorized } = await authorizedBackendForm(path, form);
  if (unauthorized) {
    return { ok: false, status: 401, body: OTURUM_BITTI as unknown as T };
  }
  if (!res) return { ok: false, status: 503, body: null };
  const text = await res.text();
  let body: T | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as T;
    } catch {
      body = text as unknown as T;
    }
  }
  return { ok: res.ok, status: res.status, body };
}

/**
 * İşlemi yapan yöneticinin adı — sipariş notlarına ekleniyor.
 *
 * Teleskor artık işlemi yapan hesabı kendisi biliyor (denetim kaydı); not
 * alanındaki ad, siparişi KULLANICIYA gösterilen metinde kimin işlediğini
 * söylemek için kalıyor. E-posta yazılmaz — yalnız görünen ad.
 */
export function teleskorAktor(displayName?: string | null): string {
  const ad = (displayName ?? "").trim();
  return ad ? ad : "panel";
}
