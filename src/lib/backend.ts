import "server-only";
import { headers } from "next/headers";

/**
 * TELESKOR BACKEND'İ (api-1) — panelin konuştuğu TEK sunucu (28 Eylül 2026).
 *
 * Panel eskiden ScoresTV'nin Spring backend'ine bağlanıyor, Teleskor'a ayrı
 * bir hizmet hesabıyla gidiyordu. ScoresTV kendi panelini yapıyor; bu panel
 * artık yalnız Teleskor'un ve giriş de Teleskor hesaplarıyla (ADMIN).
 *
 * Adres: `TELESKOR_BACKEND_URL`. api-1'de aynı Docker ağında
 * `http://app:8080` (Cloudflare'e çıkmaz, hızlı); yerelde
 * `http://localhost:8080`.
 */
const BASE =
  process.env.TELESKOR_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8080";

export function backendAdresi(): string {
  return BASE;
}

export interface BackendResult<T = unknown> {
  ok: boolean;
  status: number;
  body: T | null;
}

/**
 * İSTEMCİNİN KİMLİĞİ Teleskor'a taşınıyor.
 *
 * Teleskor giriş denemelerini, hız sınırlarını ve "yeni cihazdan giriş"
 * uyarısını `CF-Connecting-IP`'den okuyor. Panel iç ağdan bağlandığı için
 * başlık iletilmezse bütün yöneticiler panelin TEK adresinden geliyor
 * görünür: panelde birinin yanlış şifre denemesi herkesi kilitlerdi.
 * Başlık, panelin önündeki Cloudflare'in koyduğu değer (nginx olduğu gibi
 * geçiriyor). Cihaz başlıkları oturum listesinde "Yönetim paneli" yazsın
 * diye (Teleskor yüzde kodlu okuyor).
 */
async function istemciBasliklari(): Promise<Record<string, string>> {
  const b: Record<string, string> = {
    "X-Device-Platform": "WEB",
    "X-Device-Name": encodeURIComponent("Yönetim paneli"),
  };
  try {
    const gelen = await headers();
    const ip = gelen.get("cf-connecting-ip");
    const ulke = gelen.get("cf-ipcountry");
    const ua = gelen.get("user-agent");
    if (ip) b["CF-Connecting-IP"] = ip;
    if (ulke) b["CF-IPCountry"] = ulke;
    if (ua) b["User-Agent"] = ua;
  } catch {
    // İstek bağlamı yok (derleme anı) — başlıksız devam.
  }
  return b;
}

/** Teleskor'a JSON isteği; önbellek yok (yönetim verileri her zaman taze). */
export async function backendJson<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<BackendResult<T>> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(await istemciBasliklari()),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    // Teleskor kapalı / erişilemiyor
    return { ok: false, status: 503, body: null };
  }
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
 * Ham (JSON olmayan) istek — dosya yükleme gibi multipart gövdeler için.
 * Content-Type başlığını çağıran belirler (multipart'ta belirtilmez; fetch
 * sınırı kendisi ekler).
 */
export async function backendFetch(
  path: string,
  init?: RequestInit,
): Promise<Response | null> {
  try {
    return await fetch(BASE + path, {
      ...init,
      headers: { ...(await istemciBasliklari()), ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    return null;
  }
}
