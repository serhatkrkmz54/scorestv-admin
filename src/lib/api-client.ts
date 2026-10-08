"use client";

// Tarayıcı tarafından çağrılan yardımcılar — hepsi kendi BFF rotalarımıza
// gider (backend'e ASLA doğrudan değil). Çerezler otomatik iletilir.

import type {
  TeleskorHaberDetayi,
  TeleskorHaberIstegi,
  TeleskorHaberListesi,
  TeleskorHaberVarlik,
  TeleskorVarlikTur,
  AppUser,
  SurumNotu,
  SurumNotuIstegi,
  TeleskorMarketProduct,
  TeleskorMarketProductRequest,
  TeleskorMarketOrder,
  TeleskorOrderStatus,
  TeleskorUserPage,
  TeleskorUserDetail,
  TeleskorUserProfil,
  TeleskorOturumOzeti,
  TeleskorModerasyonOzeti,
  TeleskorUyeNotu,
  TeleskorCreateUserRequest,
  TeleskorRole,
  TeleskorPointAccount,
  CeviriSayfasi,
  CeviriSozlukSatiri,
  TeleskorSohbetSikayeti,
  TeleskorSohbetMacListesi,
  TeleskorSohbetMesajSayfasi,
  TeleskorAkisSikayeti,
  TeleskorDestekTalebi,
  TeleskorDestekYazismasi,
  DenetimSayfasi,
  DenetimZinciri,
  SaglikOzeti,
  YayinTanisi,
  DuyuruKaydi,
  DuyuruOnizleme,
  DuyuruIstegi,
  SozlesmeMetni,
  MotorOzeti,
  SenkronSonucu,
  TabloOrnegi,
  KimlikSonucu,
  ArsivDurumu,
  OneCikanLigYaniti,
  UygulamaAyari,
  UygulamaAyariIstegi,
  TeleskorMacOzeti,
  TeleskorNabizVideosu,
  TeleskorOzetUretim,
  OneCikanLigAramaSatiri,
  OneCikanLigIstegi,
  VeriAlani,
  TakimEksigi,
  VeriOyuncusu,
  VeriKaydi,
  VeriStadyumu,
  VeriUlkesi,
  VatandaslikDurumu,
  VeriTeknikDirektor,
  VeriTdUyusmazlik,
  YeniStadyum,
  KadroDuzeltme,
  KadroIslem,
  KadroOyuncuBulgusu,
  KadroTakimBulgusu,
  KadroTakimKadrosu,
  KadroTakimOzeti,
  AltSayfaTaramasi,
  SayfaMetaListesi,
  SiteHaritasiAdresDenetimi,
  SiteHaritasiAyarlari,
  SiteHaritasiDosyasi,
  SiteHaritasiEkAdres,
  SiteHaritasiGecmis,
  SiteHaritasiHaric,
  SiteHaritasiIndexNowSonucu,
  SiteHaritasiOzeti,
  SiteHaritasiRobots,
} from "./types";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;
  constructor(status: number, message: string, errors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

/**
 * Durum koduna karşılık gelen kısa Türkçe metin.
 *
 * <p>Yalnız gövde JSON DEĞİLKEN kullanılıyor — yani istek bir rota
 * bulamadığında ya da araya bir hata sayfası girdiğinde. O gövde kullanıcıya
 * hiçbir şey söylemiyor; söyleyen şey durum kodu.
 */
function durumMetni(status: number): string {
  if (status === 404) {
    return (
      "İstek adresi bulunamadı (404). Panel ile sunucu sürümleri uyuşmuyor " +
      "olabilir — panelin yeniden derlenmesi gerekebilir."
    );
  }
  if (status === 401 || status === 403) return "Bu işlem için yetkin yok.";
  if (status >= 500) return `Sunucu hatası (${status}).`;
  return `Bir hata oluştu (${status}).`;
}

/**
 * Yanıtı çözer.
 *
 * <p><b>JSON OLMAYAN GÖVDE MESAJ YAPILMAZ.</b> Eskiden yapılıyordu ve bir
 * kez pahalıya patladı: Veri Düzeltme masasında eksik bir BFF rotası yüzünden
 * istek Next'in 404 SAYFASINA düştü, o sayfanın tamamı (birkaç KB HTML)
 * hata mesajı olarak ekrana basıldı. Panelin bütün hata gövdeleri
 * {@code NextResponse.json} ile dönüyor; yani JSON olmayan bir gövde,
 * isteğin hiçbir rota işleyicisine ULAŞMADIĞI anlamına geliyor.
 */
async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  let jsonMu = false;
  if (text) {
    try {
      body = JSON.parse(text);
      jsonMu = true;
    } catch {
      body = null;
    }
  }
  if (!res.ok) {
    const b = (jsonMu ? body : null) as {
      message?: string;
      errors?: Record<string, string>;
    } | null;
    throw new ApiError(
      res.status,
      b?.message ?? durumMetni(res.status),
      b?.errors,
    );
  }
  return body as T;
}

const jsonInit = (method: string, data?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: data === undefined ? undefined : JSON.stringify(data),
});

// ---- Auth ----
export async function apiLogin(
  identifier: string,
  password: string,
  rememberMe: boolean,
): Promise<AppUser> {
  const res = await fetch("/api/auth/login", jsonInit("POST", { identifier, password, rememberMe }));
  const body = await parse<{ user: AppUser }>(res);
  return body.user;
}

export async function apiLogout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function apiChangePassword(data: {
  currentPassword: string;
  password: string;
  passwordConfirm: string;
}): Promise<void> {
  const res = await fetch("/api/auth/password", jsonInit("POST", data));
  await parse<{ ok: boolean }>(res);
}

// ---- News ----
export interface NewsListParams {
  status?: string;
  lang?: string;
  category?: string;
  sport?: string;
  q?: string;
  page?: number;
  size?: number;
}

// ---- Yorum moderasyonu ----
export interface CommentListParams { sport?: string; deleted?: boolean; q?: string; page?: number; size?: number; }

// ---- İletişim mesajları (ADMIN) ----

// ---- TELESKOR — Telepuan Marketi (BFF /api/teleskor/*) ----
//
// Tarayıcı Teleskor'a doğrudan gitmiyor: istek panelin sunucusundan,
// yöneticinin httpOnly çerezdeki token'ıyla geçiyor (bkz. lib/teleskor.ts).

export async function apiTeleskorProducts(): Promise<TeleskorMarketProduct[]> {
  const res = await fetch("/api/teleskor/market/urunler", { method: "GET" });
  return parse<TeleskorMarketProduct[]>(res);
}

export async function apiTeleskorCreateProduct(
  data: TeleskorMarketProductRequest,
): Promise<TeleskorMarketProduct> {
  const res = await fetch("/api/teleskor/market/urunler", jsonInit("POST", data));
  return parse<TeleskorMarketProduct>(res);
}

/** KISMİ güncelleme: gönderilmeyen alana dokunulmaz. */
export async function apiTeleskorUpdateProduct(
  id: number,
  data: TeleskorMarketProductRequest,
): Promise<TeleskorMarketProduct> {
  const res = await fetch(
    `/api/teleskor/market/urunler/${id}`,
    jsonInit("PUT", data),
  );
  return parse<TeleskorMarketProduct>(res);
}

/** Ürünü vitrinden kaldırır — SİLMEZ (siparişler ona bağlı). */
export async function apiTeleskorDeactivateProduct(id: number): Promise<void> {
  const res = await fetch(`/api/teleskor/market/urunler/${id}`, {
    method: "DELETE",
  });
  await parse<{ ok: boolean }>(res);
}

export async function apiTeleskorOrders(params?: {
  durum?: string;
  kullanici?: string;
  limit?: number;
}): Promise<TeleskorMarketOrder[]> {
  const q = new URLSearchParams();
  if (params?.durum) q.set("durum", params.durum);
  if (params?.kullanici) q.set("kullanici", params.kullanici);
  q.set("limit", String(params?.limit ?? 100));
  const res = await fetch(`/api/teleskor/market/siparisler?${q}`, {
    method: "GET",
  });
  return parse<TeleskorMarketOrder[]>(res);
}

/** İPTAL puanı ve stoğu geri verir — yalnız bir kez. */
export async function apiTeleskorUpdateOrder(
  id: number,
  durum: TeleskorOrderStatus,
  yoneticiNotu?: string,
): Promise<TeleskorMarketOrder> {
  const res = await fetch(
    `/api/teleskor/market/siparisler/${id}`,
    jsonInit("PUT", { durum, yoneticiNotu: yoneticiNotu ?? null }),
  );
  return parse<TeleskorMarketOrder>(res);
}

// ---- TELESKOR — Üye yönetimi ----

export async function apiTeleskorUsers(params?: {
  q?: string;
  status?: string;
  role?: string;
  page?: number;
  size?: number;
  /** "sonGorulme" | "sonGiris"; boş = en yeni üye önce. */
  sirala?: string;
  /** "true" | "false" */
  emailVerified?: string;
  /** GOOGLE | APPLE | YOK */
  bagliHesap?: string;
  /** Açık oturumun platformu: IOS | ANDROID | WEB | YOK */
  platform?: string;
  /** GUN | HAFTA | AY | PASIF | HIC */
  sonGorulme?: string;
}): Promise<TeleskorUserPage> {
  const q = new URLSearchParams();
  for (const k of ["q", "status", "role", "sirala", "emailVerified", "bagliHesap", "platform", "sonGorulme"] as const) {
    const v = params?.[k];
    if (v) q.set(k, v);
  }
  q.set("page", String(params?.page ?? 0));
  q.set("size", String(params?.size ?? 20));
  const res = await fetch(`/api/teleskor/users?${q}`, { method: "GET" });
  return parse<TeleskorUserPage>(res);
}

export async function apiTeleskorUser(id: number): Promise<TeleskorUserDetail> {
  const res = await fetch(`/api/teleskor/users/${id}`, { method: "GET" });
  return parse<TeleskorUserDetail>(res);
}

/**
 * Üyenin profil dökümü: favoriler, sevmediği takımlar ve profil sayıları.
 *
 * AYRI istek (detayla birlikte değil): favori adları Teleskor motorundan
 * çözülüyor ve motor yavaşsa ya da kapalıysa hesap bilgisi onu beklemesin.
 */
export async function apiTeleskorUserProfil(
  id: number,
): Promise<TeleskorUserProfil> {
  const res = await fetch(`/api/teleskor/users/${id}/profil`, { method: "GET" });
  return parse<TeleskorUserProfil>(res);
}

export async function apiTeleskorOturumlar(id: number): Promise<TeleskorOturumOzeti> {
  const res = await fetch(`/api/teleskor/users/${id}/oturumlar`, { method: "GET" });
  return parse<TeleskorOturumOzeti>(res);
}

/** Tek oturumu kapatır; gerekçe zorunlu (denetim kaydı). */
export async function apiTeleskorOturumKapat(
  id: number,
  oturumId: string,
  reason: string,
): Promise<void> {
  const res = await fetch(
    `/api/teleskor/users/${id}/oturumlar/${encodeURIComponent(oturumId)}/kapat`,
    jsonInit("POST", { reason }),
  );
  await parse<{ ok: boolean }>(res);
}

/** Üyenin hareket geçmişi (denetim kayıtları, görüntülemeler hariç). */
export async function apiTeleskorHareketler(
  id: number,
  page = 0,
  size = 20,
): Promise<DenetimSayfasi> {
  const res = await fetch(`/api/teleskor/users/${id}/hareketler?page=${page}&size=${size}`, {
    method: "GET",
  });
  return parse<DenetimSayfasi>(res);
}

export async function apiTeleskorModerasyon(id: number): Promise<TeleskorModerasyonOzeti> {
  const res = await fetch(`/api/teleskor/users/${id}/moderasyon`, { method: "GET" });
  return parse<TeleskorModerasyonOzeti>(res);
}

export async function apiTeleskorNotlar(id: number): Promise<TeleskorUyeNotu[]> {
  const res = await fetch(`/api/teleskor/users/${id}/notlar`, { method: "GET" });
  return parse<TeleskorUyeNotu[]>(res);
}

export async function apiTeleskorNotEkle(id: number, metin: string): Promise<TeleskorUyeNotu> {
  const res = await fetch(`/api/teleskor/users/${id}/notlar`, jsonInit("POST", { metin }));
  return parse<TeleskorUyeNotu>(res);
}

/** Yumuşak silme; gerekçe zorunlu (denetim kaydı). */
export async function apiTeleskorNotSil(id: number, notId: number, reason: string): Promise<void> {
  const res = await fetch(`/api/teleskor/users/${id}/notlar/${notId}/sil`, jsonInit("POST", { reason }));
  await parse<{ ok: boolean }>(res);
}

export async function apiTeleskorCreateUser(
  data: TeleskorCreateUserRequest,
): Promise<{ id: number }> {
  const res = await fetch("/api/teleskor/users", jsonInit("POST", data));
  return parse<{ id: number }>(res);
}

export async function apiTeleskorChangeRole(
  id: number,
  role: TeleskorRole,
  reason: string,
): Promise<void> {
  const res = await fetch(
    `/api/teleskor/users/${id}/role`,
    jsonInit("PUT", { role, reason }),
  );
  await parse<{ ok: boolean }>(res);
}

export async function apiTeleskorUserStatus(
  id: number,
  islem: "disable" | "enable" | "revoke-sessions",
  reason: string,
): Promise<void> {
  const res = await fetch(
    `/api/teleskor/users/${id}/status`,
    jsonInit("POST", { islem, reason }),
  );
  await parse<{ ok: boolean }>(res);
}

export async function apiTeleskorPoints(
  id: number,
): Promise<TeleskorPointAccount> {
  const res = await fetch(`/api/teleskor/users/${id}/telepuan`, {
    method: "GET",
  });
  return parse<TeleskorPointAccount>(res);
}

/** Pozitif ekler, negatif düşer. Gerekçe zorunlu (denetim kaydı). */
export async function apiTeleskorAdjustPoints(
  id: number,
  miktar: number,
  aciklama: string,
  reason: string,
): Promise<{ bakiye: number }> {
  const res = await fetch(
    `/api/teleskor/users/${id}/telepuan`,
    jsonInit("POST", { miktar, aciklama, reason }),
  );
  return parse<{ bakiye: number }>(res);
}

// ---- TELESKOR — Çeviri düzeltme masası ----

export async function apiCeviriListe(params: {
  tur: string;
  q?: string;
  sadeceEksik?: boolean;
  limit?: number;
  offset?: number;
  /** Boş ya da "tr": Türkçe masa. Başka dil (en, es, pt, fr, ru, ar): o dildeki adlar (ScoresTV). */
  lang?: string;
}): Promise<CeviriSayfasi> {
  const q = new URLSearchParams({ tur: params.tur });
  if (params.q) q.set("q", params.q);
  if (params.lang && params.lang !== "tr") q.set("lang", params.lang);
  if (params.sadeceEksik) q.set("sadeceEksik", "true");
  q.set("limit", String(params.limit ?? 200));
  q.set("offset", String(params.offset ?? 0));
  const res = await fetch(`/api/teleskor/ceviri?${q}`, { method: "GET" });
  return parse<CeviriSayfasi>(res);
}

/** Boş `ad` düzeltmeyi kaldırır. Yanıt: güncel `gorunen`. */
export async function apiCeviriYaz(
  tur: string,
  id: number,
  ad: string,
  lang?: string,
): Promise<{ gorunen: string | null; duzeltme: string | null }> {
  const govde = lang && lang !== "tr" ? { tur, id, ad, lang } : { tur, id, ad };
  const res = await fetch("/api/teleskor/ceviri", jsonInit("PUT", govde));
  return parse<{ gorunen: string | null; duzeltme: string | null }>(res);
}

export async function apiCeviriSozluk(
  ad: string,
): Promise<CeviriSozlukSatiri[]> {
  const res = await fetch(`/api/teleskor/ceviri/sozluk/${ad}`, { method: "GET" });
  return parse<CeviriSozlukSatiri[]>(res);
}

/** Boş `adTr` satırı sözlükten siler. */
export async function apiCeviriSozlukYaz(
  sozluk: string,
  adEn: string,
  adTr: string,
): Promise<void> {
  const res = await fetch(
    `/api/teleskor/ceviri/sozluk/${sozluk}`,
    jsonInit("PUT", { adEn, adTr }),
  );
  await parse<unknown>(res);
}

// ---- TELESKOR — Sohbet moderasyonu ----

export async function apiTeleskorSikayetler(
  limit = 100,
): Promise<TeleskorSohbetSikayeti[]> {
  const res = await fetch(`/api/teleskor/sohbet?limit=${limit}`, {
    method: "GET",
  });
  return parse<TeleskorSohbetSikayeti[]>(res);
}

function sorguDizesi(p: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== null && v !== "" && v !== false) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Sohbeti olan maçlar, en son yazılan önce (imleç: önceki yanıtın `sonraki`si). */
export async function apiTeleskorSohbetMaclar(p: {
  once?: string; onceMac?: number; sikayetli?: boolean; limit?: number;
}): Promise<TeleskorSohbetMacListesi> {
  const res = await fetch(`/api/teleskor/sohbet/maclar${sorguDizesi(p)}`, { method: "GET" });
  return parse<TeleskorSohbetMacListesi>(res);
}

/** Maçın mesajları, en yeni önce (arama, silinenler, üye süzgeci). */
export async function apiTeleskorSohbetMacMesajlari(macId: number, p: {
  silinen?: boolean; oncesi?: number; q?: string; kullaniciId?: number; limit?: number;
}): Promise<TeleskorSohbetMesajSayfasi> {
  const res = await fetch(`/api/teleskor/sohbet/maclar/${macId}/mesajlar${sorguDizesi(p)}`, { method: "GET" });
  return parse<TeleskorSohbetMesajSayfasi>(res);
}

/** Üyenin bütün maçlardaki mesajları (silinenler dâhil). */
export async function apiTeleskorSohbetUyeMesajlari(kullaniciId: number, p: {
  oncesi?: number; limit?: number;
}): Promise<TeleskorSohbetMesajSayfasi> {
  const res = await fetch(`/api/teleskor/sohbet/kullanicilar/${kullaniciId}/mesajlar${sorguDizesi(p)}`, { method: "GET" });
  return parse<TeleskorSohbetMesajSayfasi>(res);
}

/** Mesajı gizler; üstündeki BÜTÜN bekleyen şikayetler kapanır. */
export async function apiTeleskorMesajSil(mesajId: number): Promise<void> {
  const res = await fetch(`/api/teleskor/sohbet/mesaj/${mesajId}`, {
    method: "DELETE",
  });
  await parse<{ ok: boolean }>(res);
}

/** Şikayeti yersiz bulup kapatır — mesaja dokunmaz. */
export async function apiTeleskorSikayetKapat(
  sikayetId: number,
): Promise<void> {
  const res = await fetch(`/api/teleskor/sohbet/sikayet/${sikayetId}`, {
    method: "POST",
  });
  await parse<{ ok: boolean }>(res);
}

// ---- TELESKOR — Destek yazışması ----

/** Destek talepleri; süzgeç verilmezse KAPALI olmayanlar. */
export async function apiTeleskorDestekListe(
  durum?: string,
  limit = 100,
): Promise<TeleskorDestekTalebi[]> {
  const sorgu = new URLSearchParams({ limit: String(limit) });
  if (durum) sorgu.set("durum", durum);
  const res = await fetch(`/api/teleskor/destek?${sorgu.toString()}`, {
    method: "GET",
  });
  return parse<TeleskorDestekTalebi[]>(res);
}

/** Talebin yazışması. Açmak yöneticinin okundu damgasını atıyor. */
export async function apiTeleskorDestekYazisma(
  id: number,
): Promise<TeleskorDestekYazismasi> {
  const res = await fetch(`/api/teleskor/destek/${id}`, { method: "GET" });
  return parse<TeleskorDestekYazismasi>(res);
}

/** Cevap yaz — kullanıcı uygulamadan okuyor ve bildirim alıyor. */
export async function apiTeleskorDestekCevap(
  id: number,
  metin: string,
  medyaIdler: number[] = [],
): Promise<TeleskorDestekYazismasi> {
  const res = await fetch(`/api/teleskor/destek/${id}/cevap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metin, medyaIdler }),
  });
  return parse<TeleskorDestekYazismasi>(res);
}

/**
 * Cevaba eklenecek dosyayı ÖNCEDEN yükler; dönen kimlik
 * {@link apiTeleskorDestekCevap} çağrısında gönderiliyor.
 *
 * <p>`Content-Type` BİLEREK yazılmıyor: `FormData` verildiğinde tarayıcı
 * başlığı sınır (boundary) dizesiyle birlikte kendisi üretiyor. Elle
 * yazılan bir başlık o sınırı taşımaz ve sunucu gövdeyi ayrıştıramaz.
 */
export async function apiTeleskorDestekMedya(
  dosya: File,
): Promise<{ id: number }> {
  const form = new FormData();
  form.append("file", dosya);
  const res = await fetch("/api/teleskor/destek/medya", {
    method: "POST",
    body: form,
  });
  return parse<{ id: number }>(res);
}

export async function apiTeleskorDestekDurum(
  id: number,
  durum: string,
): Promise<void> {
  const res = await fetch(`/api/teleskor/destek/${id}/durum`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ durum }),
  });
  await parse<unknown>(res);
}

// ---- TELESKOR — Sosyal akış moderasyonu ----

/** Bekleyen akış şikayetleri (gönderi ve yorum metniyle birlikte). */
export async function apiTeleskorAkisSikayetler(
  limit = 100,
): Promise<TeleskorAkisSikayeti[]> {
  const res = await fetch(`/api/teleskor/akis?limit=${limit}`, {
    method: "GET",
  });
  return parse<TeleskorAkisSikayeti[]>(res);
}

/** Gönderiyi gizler; üstündeki BÜTÜN bekleyen şikayetler kapanır. */
export async function apiTeleskorGonderiSil(gonderiId: number): Promise<void> {
  const res = await fetch(`/api/teleskor/akis/gonderi/${gonderiId}`, {
    method: "DELETE",
  });
  await parse<{ ok: boolean }>(res);
}

/** Yorumu gizler — gönderiye dokunmaz, yorum sayacı düşer. */
export async function apiTeleskorYorumSil(yorumId: number): Promise<void> {
  const res = await fetch(`/api/teleskor/akis/yorum/${yorumId}`, {
    method: "DELETE",
  });
  await parse<{ ok: boolean }>(res);
}

/** Akış şikayetini yersiz bulup kapatır — içeriğe dokunmaz. */
export async function apiTeleskorAkisSikayetKapat(
  sikayetId: number,
): Promise<void> {
  const res = await fetch(`/api/teleskor/akis/sikayet/${sikayetId}`, {
    method: "POST",
  });
  await parse<{ ok: boolean }>(res);
}

/** Üye bilgilerini düzenle — KISMİ; gerekçe zorunlu (denetim kaydı). */
export async function apiTeleskorUserDuzenle(
  id: number,
  data: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    username?: string;
    email?: string;
    phone?: string;
    birthDate?: string | null;
    reason: string;
  },
): Promise<void> {
  const res = await fetch(
    `/api/teleskor/users/${id}/duzenle`,
    jsonInit("PUT", data),
  );
  await parse<{ ok: boolean }>(res);
}

/** Kaba kuvvet kilidini açar (destek işi). */
export async function apiTeleskorKilitAc(
  id: number,
  reason: string,
): Promise<void> {
  const res = await fetch(
    `/api/teleskor/users/${id}/kilit`,
    jsonInit("POST", { reason }),
  );
  await parse<{ ok: boolean }>(res);
}

/**
 * Onaylı hesap rozetini verir ya da geri alır.
 *
 * Rozet bir KİMLİK iddiası, e-posta doğrulaması değil; gerekçe zorunlu ve
 * denetim kaydına yazılıyor. Kullanıcının oturumları KAPANMIYOR — rozet
 * token'da taşınmadığı için yeniden giriş gerekmiyor.
 */
export async function apiTeleskorOnayRozeti(
  id: number,
  onayli: boolean,
  reason: string,
): Promise<void> {
  const res = await fetch(
    `/api/teleskor/users/${id}/onay-rozeti`,
    jsonInit("PUT", { onayli, reason }),
  );
  await parse<{ ok: boolean }>(res);
}

/**
 * Kullanıcıyı süreli olarak susturur (gönderi/yorum/sohbet kapanır).
 *
 * <p>`gerekce` KULLANICIYA GÖSTERİLİYOR: yazma denemesinde dönen 403
 * mesajı bu metni taşıyor.
 */
export async function apiTeleskorSustur(
  id: number,
  saat: number,
  gerekce: string,
): Promise<void> {
  const res = await fetch(
    `/api/teleskor/users/${id}/sustur`,
    jsonInit("POST", { saat, reason: gerekce }),
  );
  await parse<{ ok: boolean }>(res);
}

/** Susturmayı kaldırır (gerekçe denetim kaydına yazılıyor). */
export async function apiTeleskorSusturmayiKaldir(
  id: number,
  gerekce: string,
): Promise<void> {
  const res = await fetch(
    `/api/teleskor/users/${id}/sustur`,
    jsonInit("DELETE", { reason: gerekce }),
  );
  await parse<{ ok: boolean }>(res);
}

/** Profil fotoğrafını kaldırır (moderasyon; yalnız silme). */
export async function apiTeleskorAvatarSil(
  id: number,
  reason: string,
): Promise<void> {
  const res = await fetch(
    `/api/teleskor/users/${id}/avatar`,
    jsonInit("DELETE", { reason }),
  );
  await parse<{ ok: boolean }>(res);
}

// ---- TELESKOR — Denetim kaydı ----

export async function apiDenetimListe(params?: {
  userId?: string;
  event?: string;
  ip?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}): Promise<DenetimSayfasi> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== "" && k !== "page" && k !== "size") {
      q.set(k, String(v));
    }
  }
  q.set("page", String(params?.page ?? 0));
  q.set("size", String(params?.size ?? 50));
  const res = await fetch(`/api/teleskor/denetim?${q}`, { method: "GET" });
  return parse<DenetimSayfasi>(res);
}

export async function apiDenetimDogrula(): Promise<DenetimZinciri> {
  const res = await fetch("/api/teleskor/denetim/dogrula", { method: "GET" });
  return parse<DenetimZinciri>(res);
}

// ---- TELESKOR — Sistem sağlığı ----

export async function apiTeleskorSaglik(): Promise<SaglikOzeti> {
  const res = await fetch("/api/teleskor/saglik", { method: "GET" });
  return parse<SaglikOzeti>(res);
}

/**
 * Yayın tanısı. `macId` verilmezse yalnız ayar durumu denetlenir;
 * verilince o maçın beş kapısı tek tek sınanır.
 */
export async function apiTeleskorYayinTani(
  macId?: number,
): Promise<YayinTanisi> {
  const q = macId ? `?mac=${macId}` : "";
  const res = await fetch(`/api/teleskor/yayin${q}`, { method: "GET" });
  return parse<YayinTanisi>(res);
}

// ---- TELESKOR — Sözleşme metinleri ----

export async function apiSozlesmeler(): Promise<SozlesmeMetni[]> {
  const res = await fetch("/api/teleskor/sozlesme", { method: "GET" });
  return parse<SozlesmeMetni[]>(res);
}

export async function apiSozlesmeYayinla(data: {
  type: string;
  version: string;
  url: string;
  contentSha256?: string;
  mandatory?: boolean;
  effectiveFrom?: string;
  reason: string;
}): Promise<SozlesmeMetni> {
  const res = await fetch("/api/teleskor/sozlesme", jsonInit("POST", data));
  return parse<SozlesmeMetni>(res);
}

// ---- TELESKOR — Motor operasyonu ----

export async function apiMotorOzeti(): Promise<MotorOzeti> {
  const res = await fetch("/api/teleskor/motor", { method: "GET" });
  return parse<MotorOzeti>(res);
}

export async function apiMotorSenkronCalistir(
  kaynak: string,
): Promise<SenkronSonucu> {
  const res = await fetch(
    `/api/teleskor/motor/senkron/${encodeURIComponent(kaynak)}`,
    { method: "POST" },
  );
  return parse<SenkronSonucu>(res);
}

export async function apiMotorTablo(tablo: string): Promise<TabloOrnegi> {
  const res = await fetch(
    `/api/teleskor/motor/tablo/${encodeURIComponent(tablo)}`,
    { method: "GET" },
  );
  return parse<TabloOrnegi>(res);
}

/**
 * Kimlik arama. Sağlayıcı yönünde ARAMA TÜM TÜRLERDE yapılır — sağlayıcı
 * kimlikleri yalnız kendi türü içinde benzersiz ve aynı metin birden çok
 * varlığa denk gelebiliyor.
 */
export async function apiMotorKimlik(params: {
  saglayici?: string;
  tur?: string;
  id?: string;
}): Promise<KimlikSonucu> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v);
  }
  const res = await fetch(`/api/teleskor/motor/kimlik?${q}`, { method: "GET" });
  return parse<KimlikSonucu>(res);
}

export async function apiMotorArsiv(): Promise<ArsivDurumu> {
  const res = await fetch("/api/teleskor/motor/arsiv", { method: "GET" });
  return parse<ArsivDurumu>(res);
}

export async function apiMotorArsivIslem(
  islem: "yukle" | "durdur",
): Promise<{ durum?: string; mesaj?: string }> {
  const res = await fetch(
    "/api/teleskor/motor/arsiv",
    jsonInit("POST", { islem }),
  );
  return parse<{ durum?: string; mesaj?: string }>(res);
}

// ---- TELESKOR — Duyurular ----

export async function apiTeleskorDuyurular(): Promise<DuyuruKaydi[]> {
  const res = await fetch("/api/teleskor/duyuru", { method: "GET" });
  return parse<DuyuruKaydi[]>(res);
}

/** "Bu duyuru kaç kişiye gider?" — gönder düğmesinden önceki tek soru. */
export async function apiTeleskorDuyuruOnizleme(
  tur: string,
): Promise<DuyuruOnizleme> {
  const res = await fetch(
    `/api/teleskor/duyuru/onizleme?tur=${encodeURIComponent(tur)}`,
    { method: "GET" },
  );
  return parse<DuyuruOnizleme>(res);
}

/**
 * Duyuruyu gönderir. 202 döner: kayıt açıldı, gönderim arka planda
 * sürüyor — sonuç listeden izleniyor.
 */
export async function apiTeleskorDuyuruGonder(
  istek: DuyuruIstegi,
): Promise<{ id: number }> {
  const res = await fetch("/api/teleskor/duyuru", jsonInit("POST", istek));
  return parse<{ id: number }>(res);
}

/** Uygulama ayarları kataloğu (V67). */
export async function apiTeleskorUygulamaAyarlari(): Promise<UygulamaAyari[]> {
  const res = await fetch("/api/teleskor/ayarlar", { cache: "no-store" });
  return parse<UygulamaAyari[]>(res);
}

export async function apiTeleskorUygulamaAyariKaydet(
  anahtar: string,
  istek: UygulamaAyariIstegi,
): Promise<UygulamaAyari> {
  const res = await fetch(
    `/api/teleskor/ayarlar/${encodeURIComponent(anahtar)}`,
    jsonInit("PUT", istek),
  );
  return parse<UygulamaAyari>(res);
}

export async function apiTeleskorUygulamaAyariVarsayilan(
  anahtar: string,
  reason: string,
): Promise<UygulamaAyari> {
  const res = await fetch(
    `/api/teleskor/ayarlar/${encodeURIComponent(anahtar)}`,
    jsonInit("DELETE", { reason }),
  );
  return parse<UygulamaAyari>(res);
}

/** Öne çıkan lig listesi (spor başına ayrı). */
export async function apiTeleskorOneCikanLigler(
  spor: string,
): Promise<OneCikanLigYaniti> {
  const res = await fetch(
    `/api/teleskor/one-cikan-ligler?spor=${encodeURIComponent(spor)}`,
    { cache: "no-store" },
  );
  return parse<OneCikanLigYaniti>(res);
}

/** Listeyi BÜTÜN olarak kaydeder; yanıt kaydedilmiş listenin kendisi. */
export async function apiTeleskorOneCikanLigKaydet(
  istek: OneCikanLigIstegi,
): Promise<OneCikanLigYaniti> {
  const res = await fetch(
    "/api/teleskor/one-cikan-ligler",
    jsonInit("PUT", istek),
  );
  return parse<OneCikanLigYaniti>(res);
}

/** Listeye eklenecek ligi aramak için. */
export async function apiTeleskorLigAra(
  spor: string,
  q: string,
): Promise<OneCikanLigAramaSatiri[]> {
  const res = await fetch(
    `/api/teleskor/one-cikan-ligler/ara?spor=${encodeURIComponent(spor)}&q=${encodeURIComponent(q)}`,
    { cache: "no-store" },
  );
  return parse<OneCikanLigAramaSatiri[]>(res);
}

// ---- Teleskor: maç özeti videosu (V55) ----

/** Günün maçları — özet eklenecek maçı seçmek için. */
export async function apiTeleskorOzetMaclari(
  date: string,
  sport: string,
): Promise<unknown> {
  const res = await fetch(
    `/api/teleskor/mac-ozeti/maclar?date=${encodeURIComponent(date)}&sport=${encodeURIComponent(sport)}`,
    { cache: "no-store" },
  );
  return parse<unknown>(res);
}

/**
 * Verilen maçlarda özet var mı — gün ekranı.
 *
 * <p>Maç başına ayrı istek yerine TEK istek: 600 maçlık bir cumartesi
 * aksi hâlde 600 istek ederdi.
 *
 * <p><b>Kimlikler GÖVDEDE, adres satırında değil.</b> İlk sürüm
 * `?ids=1,2,3` yazıyordu ve üretimde 520 ile patladı: gerçek bir günde
 * ~1900 maç var, yani ~16 KB'lık bir adres — nginx'in 8 KB'lık başlık
 * tamponunu aşıyor ve istek origin'e hiç ulaşmıyor.
 */
export async function apiTeleskorOzetDurumlari(
  macIds: number[],
): Promise<Record<string, TeleskorMacOzeti>> {
  if (macIds.length === 0) return {};
  const res = await fetch(
    "/api/teleskor/mac-ozeti",
    jsonInit("POST", { ids: macIds.map(String) }),
  );
  return parse<Record<string, TeleskorMacOzeti>>(res);
}

/** Son eklenen özetler. */
export async function apiTeleskorSonOzetler(
  limit = 50,
): Promise<TeleskorMacOzeti[]> {
  const res = await fetch(`/api/teleskor/mac-ozeti?limit=${limit}`, {
    cache: "no-store",
  });
  return parse<TeleskorMacOzeti[]>(res);
}

/**
 * Özeti kaydeder.
 *
 * @param adres bağlantı YA DA tam `<iframe>` bloğu — sunucu ikisini de
 *              kabul edip yalnız oynatıcı adresini saklıyor.
 */
export async function apiTeleskorOzetKaydet(
  macId: number,
  adres: string,
  baslik: string | null,
  yayinda: boolean,
): Promise<TeleskorMacOzeti> {
  const res = await fetch(
    `/api/teleskor/mac-ozeti/${macId}`,
    jsonInit("PUT", { adres, baslik, yayinda }),
  );
  return parse<TeleskorMacOzeti>(res);
}

/** Günün maçlarında hangi nabız videosu var (otomatik/elle) — tek istek. */
export async function apiTeleskorNabizDurumlari(
  macIds: number[],
): Promise<Record<string, TeleskorNabizVideosu>> {
  if (macIds.length === 0) return {};
  const res = await fetch(
    "/api/teleskor/mac-ozeti/nabiz",
    jsonInit("POST", { ids: macIds.map(String) }),
  );
  return parse<Record<string, TeleskorNabizVideosu>>(res);
}

/** Özet videosunu sunucuda üretmeye başlar (202; durum için yokla). */
export async function apiTeleskorOzetUret(
  macId: number,
): Promise<TeleskorOzetUretim> {
  const res = await fetch(`/api/teleskor/mac-ozeti/${macId}/uret`, {
    method: "POST",
    headers: { "x-requested-with": "fetch" },
  });
  return parse<TeleskorOzetUretim>(res);
}

/** Üretim durumu; sunucuda iş yoksa null. */
export async function apiTeleskorOzetUretimDurumu(
  macId: number,
): Promise<TeleskorOzetUretim | null> {
  const res = await fetch(`/api/teleskor/mac-ozeti/${macId}/uretim`, {
    headers: { "x-requested-with": "fetch" },
  });
  return parse<TeleskorOzetUretim | null>(res);
}

/** Özeti siler (idempotent). */
export async function apiTeleskorOzetSil(macId: number): Promise<void> {
  const res = await fetch(`/api/teleskor/mac-ozeti/${macId}`, {
    method: "DELETE",
    headers: { "x-requested-with": "fetch" },
  });
  if (!res.ok) await parse<unknown>(res);
}

/** Nabız videosunu düzenler (adres/başlık/yayında) — V65; adres kuralı sunucuda. */
export async function apiTeleskorNabizKaydet(
  macId: number,
  adres: string,
  baslik: string | null,
  yayinda: boolean,
): Promise<TeleskorNabizVideosu> {
  const res = await fetch(
    `/api/teleskor/mac-ozeti/${macId}/nabiz`,
    jsonInit("PUT", { adres, baslik, yayinda }),
  );
  return parse<TeleskorNabizVideosu>(res);
}

export async function apiTeleskorNabizSil(macId: number): Promise<void> {
  const res = await fetch(`/api/teleskor/mac-ozeti/${macId}/nabiz`, {
    method: "DELETE",
    headers: { "x-requested-with": "fetch" },
  });
  if (!res.ok) await parse<unknown>(res);
}

// ---- Teleskor: sürüm notları (Gelen Kutusu) ----

/** Sürüm notları — yayınlanmamış (ileri tarihli) olanlar da geliyor. */
export async function apiTeleskorSurumNotlari(): Promise<SurumNotu[]> {
  const res = await fetch("/api/teleskor/surum-notu", { method: "GET" });
  return parse<SurumNotu[]>(res);
}

/**
 * Sürüm notu yazar.
 *
 * <p>BİLDİRİM GÖNDERMİYOR: not Gelen Kutusu'na düşüyor, telefon
 * titremiyor. Duyurulmak isteniyorsa Duyurular sayfasından ayrıca bir
 * DUYURU gönderilmeli — iki iş, iki bilinçli tık.
 */
export async function apiTeleskorSurumNotuYaz(
  istek: SurumNotuIstegi,
): Promise<{ id: number }> {
  const res = await fetch("/api/teleskor/surum-notu", jsonInit("POST", istek));
  return parse<{ id: number }>(res);
}

/** Başlık ve metni düzeltir; sürüm ve görseller değişmez. */
export async function apiTeleskorSurumNotuDuzelt(
  id: number,
  baslik: string,
  metin: string,
): Promise<void> {
  const res = await fetch(
    `/api/teleskor/surum-notu/${id}`,
    jsonInit("PUT", { baslik, metin }),
  );
  await parse<unknown>(res);
}

export async function apiTeleskorSurumNotuSil(id: number): Promise<void> {
  const res = await fetch(`/api/teleskor/surum-notu/${id}`, {
    method: "DELETE",
  });
  await parse<unknown>(res);
}

// ---------------------------------------------------------------------------
// VERİ DÜZELTME MASASI (motor V96) — alan yamaları
// ---------------------------------------------------------------------------

export async function apiVeriAlanlar(): Promise<VeriAlani[]> {
  const res = await fetch("/api/teleskor/veri/alanlar", { cache: "no-store" });
  return parse<VeriAlani[]>(res);
}

export async function apiVeriEksik(lig: number): Promise<TakimEksigi[]> {
  const res = await fetch(`/api/teleskor/veri/eksik?lig=${lig}`, {
    cache: "no-store",
  });
  return parse<TakimEksigi[]>(res);
}

export async function apiVeriOyuncular(takim: number): Promise<VeriOyuncusu[]> {
  const res = await fetch(`/api/teleskor/veri/oyuncular?takim=${takim}`, {
    cache: "no-store",
  });
  return parse<VeriOyuncusu[]>(res);
}

/**
 * Stadyum seçici. `q` ile arar, `ids` ile mevcut değerin adını çözer.
 * İkisi de boşsa istek ATILMIYOR — cevabı zaten boş liste.
 */
export async function apiVeriStadyumlar(
  arama: { q?: string; ids?: number[] },
): Promise<VeriStadyumu[]> {
  const q = (arama.q ?? "").trim();
  const ids = (arama.ids ?? []).join(",");
  if (!ids && q.length < 2) return [];
  const res = await fetch(
    `/api/teleskor/veri/stadyumlar?q=${encodeURIComponent(q)}&ids=${ids}`,
    { cache: "no-store" },
  );
  return parse<VeriStadyumu[]>(res);
}

/**
 * Sağlayıcıda olmayan bir stadyumu açar. Motor aynı adda kayıt bulursa 409
 * döner ve mesajında var olanı gösterir; `yineDeAc: true` ile geçilir.
 */
export async function apiVeriStadyumAc(
  istek: YeniStadyum,
): Promise<VeriStadyumu> {
  const res = await fetch("/api/teleskor/veri/stadyumlar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(istek),
  });
  return parse<VeriStadyumu>(res);
}

export async function apiVeriKayit(
  tur: string,
  id: number,
): Promise<VeriKaydi> {
  const res = await fetch(
    `/api/teleskor/veri/kayit?tur=${encodeURIComponent(tur)}&id=${id}`,
    { cache: "no-store" },
  );
  return parse<VeriKaydi>(res);
}

/** `deger` null ise alan boşaltılır; `kaldir` ise yama silinir. */
/**
 * @param takimId panelde açık takım (varsa) — ürün backend'i yamadan sonra o
 *   takımın kadro ve künye önbelleğini de siler; yamalanan kaydınkini zaten siler.
 */
export async function apiVeriYaz(takimId: number | undefined, istek: {
  tur: string;
  id: number;
  alan: string;
  deger?: string | null;
  gerekce?: string;
  kaldir?: boolean;
}): Promise<{ yazildi?: boolean; kaldirildi?: boolean; not?: string }> {
  const yol = takimId ? `/api/teleskor/veri?takim=${takimId}` : "/api/teleskor/veri";
  const res = await fetch(yol, jsonInit("PUT", istek));
  return parse<{ yazildi?: boolean; kaldirildi?: boolean; not?: string }>(res);
}

/** Teknik direktör seçici (motor V107). */
export async function apiVeriTeknikDirektorler(
  arama: { q?: string; ids?: number[] },
): Promise<VeriTeknikDirektor[]> {
  const q = (arama.q ?? "").trim();
  const ids = (arama.ids ?? []).join(",");
  if (!ids && q.length < 2) return [];
  const res = await fetch(
    `/api/teleskor/veri/teknik-direktorler?q=${encodeURIComponent(q)}&ids=${ids}`,
    { cache: "no-store" },
  );
  return parse<VeriTeknikDirektor[]>(res);
}

/** Katalogda olmayan teknik direktörü açar; 409 = aynı adda kayıt var. */
export async function apiVeriTeknikDirektorAc(istek: {
  ad: string;
  takimId?: number;
  gerekce: string;
  yineDeAc?: boolean;
}): Promise<VeriTeknikDirektor> {
  const res = await fetch("/api/teleskor/veri/teknik-direktorler", jsonInit("POST", istek));
  return parse<VeriTeknikDirektor>(res);
}

/** Ligin teknik direktör kontrol listesi (motor V107). */
export async function apiVeriTdUyusmazlik(lig: number): Promise<VeriTdUyusmazlik[]> {
  const res = await fetch(`/api/teleskor/veri/td-uyusmazlik?lig=${lig}`, { cache: "no-store" });
  return parse<VeriTdUyusmazlik[]>(res);
}

/** Ülke seçici (motor V106). */
export async function apiVeriUlkeler(
  arama: { q?: string; ids?: number[] },
  spor = 1,
): Promise<VeriUlkesi[]> {
  const q = (arama.q ?? "").trim();
  const ids = (arama.ids ?? []).join(",");
  if (!ids && q.length < 1) return [];
  const res = await fetch(
    `/api/teleskor/veri/ulkeler?q=${encodeURIComponent(q)}&ids=${ids}&spor=${spor}`,
    { cache: "no-store" },
  );
  return parse<VeriUlkesi[]>(res);
}

/** Vatandaşlık düzeltmesi yaz; `kaldir` ise sağlayıcının listesine döner. */
export async function apiVeriVatandaslikYaz(istek: {
  id: number;
  ulkeIdler?: number[];
  gerekce?: string;
  kaldir?: boolean;
}): Promise<VatandaslikDurumu> {
  const res = await fetch("/api/teleskor/veri/vatandaslik", jsonInit("PUT", istek));
  return parse<VatandaslikDurumu>(res);
}

/**
 * Oyuncu fotoğrafı / takım logosu yükle (motor V106). `dosya` Base64 data URL.
 * @param takimId panelde açık takım — kadro önbelleği de silinsin
 */
export async function apiVeriGorsel(takimId: number | undefined, istek: {
  tur: "PLAYER" | "TEAM";
  id: number;
  dosya: string;
  gerekce: string;
}): Promise<{ yazildi: boolean; adres: string }> {
  const yol = takimId ? `/api/teleskor/veri/gorsel?takim=${takimId}` : "/api/teleskor/veri/gorsel";
  const res = await fetch(yol, jsonInit("POST", istek));
  return parse<{ yazildi: boolean; adres: string }>(res);
}

// ---------------------------------------------------------------------------
// KADRO MASASI (motor V105) — takım kadrosunda elle düzeltme
// ---------------------------------------------------------------------------

export async function apiKadroTakimlar(lig: number): Promise<KadroTakimOzeti[]> {
  const res = await fetch(`/api/teleskor/kadro/takimlar?lig=${lig}`, {
    cache: "no-store",
  });
  return parse<KadroTakimOzeti[]>(res);
}

export async function apiKadroTakim(takim: number): Promise<KadroTakimKadrosu> {
  const res = await fetch(`/api/teleskor/kadro/takim?takim=${takim}`, {
    cache: "no-store",
  });
  return parse<KadroTakimKadrosu>(res);
}

export async function apiKadroOyuncuAra(q: string): Promise<KadroOyuncuBulgusu[]> {
  if (q.trim().length < 2) return [];
  const res = await fetch(
    `/api/teleskor/kadro/oyuncu-ara?q=${encodeURIComponent(q.trim())}`,
    { cache: "no-store" },
  );
  return parse<KadroOyuncuBulgusu[]>(res);
}

export async function apiKadroTakimAra(q: string): Promise<KadroTakimBulgusu[]> {
  if (q.trim().length < 2) return [];
  const res = await fetch(
    `/api/teleskor/kadro/takim-ara?q=${encodeURIComponent(q.trim())}`,
    { cache: "no-store" },
  );
  const r = await parse<{ sonuclar?: KadroTakimBulgusu[] }>(res);
  return r.sonuclar ?? [];
}

export async function apiKadroDuzeltmeler(
  lig: number | null,
  kapali: boolean,
): Promise<KadroDuzeltme[]> {
  const ligParam = lig ? `&lig=${lig}` : "";
  const res = await fetch(
    `/api/teleskor/kadro/duzeltmeler?kapali=${kapali}${ligParam}`,
    { cache: "no-store" },
  );
  return parse<KadroDuzeltme[]>(res);
}

/** `ekTakim`: taşımada eski takım — yalnız önbellek ipucu. */
export async function apiKadroYaz(
  istek: {
    takimId: number;
    oyuncuId: number;
    islem: KadroIslem;
    mevki?: string | null;
    forma?: string | null;
    gerekce: string;
  },
  ekTakim?: number,
): Promise<KadroDuzeltme> {
  const res = await fetch(
    `/api/teleskor/kadro${ekTakim ? `?ekTakim=${ekTakim}` : ""}`,
    jsonInit("POST", istek),
  );
  return parse<KadroDuzeltme>(res);
}

export async function apiKadroGeriAl(id: number, ekTakim?: number): Promise<KadroDuzeltme> {
  const res = await fetch(
    `/api/teleskor/kadro/${id}${ekTakim ? `?ekTakim=${ekTakim}` : ""}`,
    { method: "DELETE" },
  );
  return parse<KadroDuzeltme>(res);
}

export async function apiKadroKapatDene(): Promise<{ kapanan: number }> {
  const res = await fetch("/api/teleskor/kadro/kapat-dene", { method: "POST" });
  return parse<{ kapanan: number }>(res);
}

// ---------------------------------------------------------------------------
// TELESKOR HABERLERİ (V69) — /api/teleskor/haber
// ---------------------------------------------------------------------------

export async function apiTeleskorHaberler(
  durum: string,
  q: string,
  sayfa: number,
): Promise<TeleskorHaberListesi> {
  const p = new URLSearchParams();
  if (durum) p.set("durum", durum);
  if (q.trim()) p.set("q", q.trim());
  p.set("sayfa", String(sayfa));
  const res = await fetch(`/api/teleskor/haber?${p.toString()}`, { method: "GET" });
  return parse<TeleskorHaberListesi>(res);
}

export async function apiTeleskorHaber(id: number): Promise<TeleskorHaberDetayi> {
  const res = await fetch(`/api/teleskor/haber/${id}`, { method: "GET" });
  return parse<TeleskorHaberDetayi>(res);
}

export async function apiTeleskorHaberKaydet(
  id: number | null,
  istek: TeleskorHaberIstegi,
): Promise<TeleskorHaberDetayi> {
  const res = await fetch(id ? `/api/teleskor/haber/${id}` : `/api/teleskor/haber`, {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(istek),
  });
  return parse<TeleskorHaberDetayi>(res);
}

export async function apiTeleskorHaberSil(id: number): Promise<void> {
  const res = await fetch(`/api/teleskor/haber/${id}`, { method: "DELETE" });
  await parse<unknown>(res);
}

export async function apiTeleskorHaberIndexNow(id: number): Promise<void> {
  const res = await fetch(`/api/teleskor/haber/${id}/indexnow`, { method: "POST" });
  await parse<unknown>(res);
}

export async function apiTeleskorHaberVarlikAra(
  tur: TeleskorVarlikTur,
  q: string,
  spor: string | null,
): Promise<TeleskorHaberVarlik[]> {
  const p = new URLSearchParams({ tur, q, spor: spor ?? "FOOTBALL" });
  const res = await fetch(`/api/teleskor/haber/varlik-ara?${p.toString()}`, { method: "GET" });
  return parse<TeleskorHaberVarlik[]>(res);
}

/**
 * Teleskor haber görseli — ilerlemeli (RichEditor ve kapak). Yanıtı
 * editörün beklediği `{ url }` biçimine çeviriyor; kapak için `anahtar` da var.
 */
export function apiTeleskorHaberGorsel(
  dosya: File,
  onIlerleme?: (yuzde: number) => void,
): Promise<{ url: string; anahtar: string }> {
  return new Promise((cevap, hata) => {
    const form = new FormData();
    form.append("file", dosya);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/teleskor/haber/gorsel");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onIlerleme) onIlerleme(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let govde: { anahtar?: string; adres?: string; message?: string } = {};
      try {
        govde = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        govde = { message: xhr.responseText };
      }
      if (xhr.status >= 200 && xhr.status < 300 && govde.adres && govde.anahtar) {
        cevap({ url: govde.adres, anahtar: govde.anahtar });
        return;
      }
      hata(new ApiError(xhr.status, govde.message ?? "Görsel yüklenemedi."));
    };
    xhr.onerror = () => hata(new ApiError(0, "Sunucuya ulaşılamadı."));
    xhr.send(form);
  });
}

// ---- Site haritası (ADMIN ve SEO) ----

export async function apiSiteHaritasi(): Promise<SiteHaritasiAyarlari> {
  const res = await fetch("/api/teleskor/site-haritasi", { cache: "no-store" });
  return parse<SiteHaritasiAyarlari>(res);
}

export async function apiSiteHaritasiTur(
  tur: string,
  istek: { acik: boolean; oncelik: number | null; siklik: string | null },
): Promise<SiteHaritasiAyarlari> {
  const res = await fetch(
    `/api/teleskor/site-haritasi/turler/${encodeURIComponent(tur)}`,
    jsonInit("PUT", istek),
  );
  return parse<SiteHaritasiAyarlari>(res);
}

export async function apiSiteHaritasiEkAdresEkle(istek: {
  yol: string;
  oncelik: number | null;
  siklik: string | null;
  not: string;
}): Promise<SiteHaritasiEkAdres> {
  const res = await fetch("/api/teleskor/site-haritasi/ek-adresler", jsonInit("POST", istek));
  return parse<SiteHaritasiEkAdres>(res);
}

export async function apiSiteHaritasiEkAdresSil(id: number): Promise<void> {
  const res = await fetch(`/api/teleskor/site-haritasi/ek-adresler/${id}`, { method: "DELETE" });
  await parse<unknown>(res);
}

export async function apiSiteHaritasiHaricEkle(istek: {
  kalip: string;
  noindex: boolean;
  not: string;
}): Promise<SiteHaritasiHaric> {
  const res = await fetch("/api/teleskor/site-haritasi/haricler", jsonInit("POST", istek));
  return parse<SiteHaritasiHaric>(res);
}

export async function apiSiteHaritasiHaricSil(id: number): Promise<void> {
  const res = await fetch(`/api/teleskor/site-haritasi/haricler/${id}`, { method: "DELETE" });
  await parse<unknown>(res);
}

export async function apiSiteHaritasiHaricNoindex(id: number, noindex: boolean): Promise<SiteHaritasiAyarlari> {
  const res = await fetch(`/api/teleskor/site-haritasi/haricler/${id}`, jsonInit("PUT", { noindex }));
  return parse<SiteHaritasiAyarlari>(res);
}

export async function apiSiteHaritasiRobotsEkle(istek: {
  kural: "ALLOW" | "DISALLOW";
  yol: string;
  not: string;
}): Promise<SiteHaritasiRobots> {
  const res = await fetch("/api/teleskor/site-haritasi/robots", jsonInit("POST", istek));
  return parse<SiteHaritasiRobots>(res);
}

export async function apiSiteHaritasiRobotsSil(id: number): Promise<void> {
  const res = await fetch(`/api/teleskor/site-haritasi/robots/${id}`, { method: "DELETE" });
  await parse<unknown>(res);
}

export async function apiSiteHaritasiGecmis(sayfa: number): Promise<SiteHaritasiGecmis> {
  const res = await fetch(`/api/teleskor/site-haritasi/gecmis?sayfa=${sayfa}`, { cache: "no-store" });
  return parse<SiteHaritasiGecmis>(res);
}

export async function apiSiteHaritasiIndexNow(adresler: string[]): Promise<SiteHaritasiIndexNowSonucu> {
  const res = await fetch("/api/teleskor/site-haritasi/indexnow", jsonInit("POST", { adresler }));
  return parse<SiteHaritasiIndexNowSonucu>(res);
}

export async function apiSiteHaritasiOzet(): Promise<SiteHaritasiOzeti> {
  const res = await fetch("/api/teleskor/site-haritasi/ozet", { cache: "no-store" });
  return parse<SiteHaritasiOzeti>(res);
}

export async function apiSiteHaritasiDosya(yol: string, q: string): Promise<SiteHaritasiDosyasi> {
  const res = await fetch(
    `/api/teleskor/site-haritasi/dosya?yol=${encodeURIComponent(yol)}&q=${encodeURIComponent(q)}`,
    { cache: "no-store" },
  );
  return parse<SiteHaritasiDosyasi>(res);
}

export async function apiSiteHaritasiDenetle(adres: string): Promise<SiteHaritasiAdresDenetimi> {
  const res = await fetch(`/api/teleskor/site-haritasi/denetle?adres=${encodeURIComponent(adres)}`, {
    cache: "no-store",
  });
  return parse<SiteHaritasiAdresDenetimi>(res);
}

export async function apiSiteHaritasiRobotsTxt(): Promise<{ metin: string }> {
  const res = await fetch("/api/teleskor/site-haritasi/robots-txt", { cache: "no-store" });
  return parse<{ metin: string }>(res);
}

export async function apiSayfaMetaListe(q: string, sayfa: number): Promise<SayfaMetaListesi> {
  const res = await fetch(`/api/teleskor/site-haritasi/sayfalar?q=${encodeURIComponent(q)}&sayfa=${sayfa}`, {
    cache: "no-store",
  });
  return parse<SayfaMetaListesi>(res);
}

export async function apiSayfaMetaYaz(istek: {
  yol: string;
  baslik: string;
  aciklama: string;
  not: string;
}): Promise<SayfaMetaListesi> {
  const res = await fetch("/api/teleskor/site-haritasi/sayfalar", jsonInit("PUT", istek));
  return parse<SayfaMetaListesi>(res);
}

export async function apiSayfaMetaSil(id: number): Promise<void> {
  const res = await fetch(`/api/teleskor/site-haritasi/sayfalar/${id}`, { method: "DELETE" });
  await parse<unknown>(res);
}

export async function apiAltSayfaTaramasi(adres: string): Promise<AltSayfaTaramasi> {
  const res = await fetch(`/api/teleskor/site-haritasi/alt-sayfalar?adres=${encodeURIComponent(adres)}`, {
    cache: "no-store",
  });
  return parse<AltSayfaTaramasi>(res);
}

// ---- Üyenin şifresi (yönetici) ----

export async function apiTeleskorSifreBaglantisi(id: number, reason: string): Promise<void> {
  const res = await fetch(`/api/teleskor/users/${id}/sifre-baglantisi`, jsonInit("POST", { reason }));
  await parse<{ ok: boolean }>(res);
}

export async function apiTeleskorSifreBelirle(
  id: number,
  sifre: string,
  oturumlariKapat: boolean,
  reason: string,
): Promise<{ oturumlarKapandi: boolean }> {
  const res = await fetch(`/api/teleskor/users/${id}/sifre`, jsonInit("PUT", { sifre, oturumlariKapat, reason }));
  return parse<{ oturumlarKapandi: boolean }>(res);
}

// ---------------------------------------------------------------------------
// Kim Daha Değerli? (api-1 V75)
// ---------------------------------------------------------------------------

export type KddHavuzSatiri = {
  id: number;
  ad: string;
  foto?: string | null;
  takim?: string | null;
  lig?: string | null;
  deger: number;
  birim?: string | null;
  degerTarihi?: string | null;
  haric: boolean;
};
export type KddHavuz = { olusturuldu: string; toplam: number; haricSayisi: number; oyuncular: KddHavuzSatiri[] };
export type KddHaric = { playerId: number; ad: string | null; notu: string | null; eklendi: string; ekleyen: string | null };
export type KddOyuncuOzeti = { id: number; ad: string; takim?: string | null; deger: number; birim?: string | null };
export type KddIstatistik = {
  gun: string;
  bicimler: { mod: string; baslayan: number; biten: number; misafir: number; uye: number; ortalamaDogru: number | null; enIyi: number }[];
  duelloAcilan: number;
  gununDuellosu?: {
    kod: string;
    bitiren: number;
    sorular: { no: number; sol: KddOyuncuOzeti; sag: KddOyuncuOzeti; dogruTaraf: "SOL" | "SAG"; cevaplayan: number; dogruOrani: number | null }[];
  };
};

export async function apiTeleskorKddHavuz(q: string, sadeceHaric: boolean): Promise<KddHavuz> {
  const res = await fetch(`/api/teleskor/kdd/havuz?q=${encodeURIComponent(q)}&sadeceHaric=${sadeceHaric}`, { cache: "no-store" });
  return parse<KddHavuz>(res);
}

export async function apiTeleskorKddTazele(): Promise<{ toplam: number }> {
  const res = await fetch("/api/teleskor/kdd/havuz/tazele", jsonInit("POST", {}));
  return parse<{ toplam: number }>(res);
}

export async function apiTeleskorKddHaricler(): Promise<KddHaric[]> {
  const res = await fetch("/api/teleskor/kdd/haric", { cache: "no-store" });
  return parse<KddHaric[]>(res);
}

export async function apiTeleskorKddHaricEkle(playerId: number, notu: string): Promise<void> {
  const res = await fetch("/api/teleskor/kdd/haric", jsonInit("POST", { playerId, notu }));
  await parse<unknown>(res);
}

export async function apiTeleskorKddHaricSil(playerId: number): Promise<void> {
  const res = await fetch(`/api/teleskor/kdd/haric/${playerId}`, { method: "DELETE" });
  await parse<unknown>(res);
}

export async function apiTeleskorKddIstatistik(gun: string): Promise<KddIstatistik> {
  const res = await fetch(`/api/teleskor/kdd/istatistik${gun ? `?gun=${gun}` : ""}`, { cache: "no-store" });
  return parse<KddIstatistik>(res);
}
