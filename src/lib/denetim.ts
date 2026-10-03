/**
 * Denetim kaydının Türkçe gösterimi — Denetim Kaydı sayfası ve üye kartının
 * hareket geçmişi AYNI tabloları kullanır (iki kopya ayrışmasın).
 */
import type { DenetimSatiri } from "@/lib/types";

/**
 * Denetim olaylarının Türkçesi — AuditEvent enum'unun TAMAMI (79 olay;
 * 2 Ekim'de 8 eksik + 14 yeni panel işlemi eklendi).
 *
 * <p>İlk yazımda yalnız gözüme çarpanları yazmıştım ve yarısı ham kod
 * olarak görünüyordu; biri de yanlıştı ({@code LOGIN_FAILED} diye bir
 * olay yok, doğrusu {@code LOGIN_FAILURE}). Liste artık enum'dan
 * çıkarıldı, göz kararı değil.
 *
 * <p>TANINMAYAN OLAY HAM GÖSTERİLİYOR: sunucuya yeni bir olay
 * eklendiğinde ekranda boşluk değil kodun kendisi çıksın ve buraya
 * eklenmesi gerektiği görünsün.
 */
export const OLAY_TR: Record<string, string> = {
  // Üyelik
  REGISTER: "Kayıt oldu",
  REGISTER_BLOCKED: "Kayıt engellendi",
  LOGIN_SUCCESS: "Giriş yapıldı",
  LOGIN_FAILURE: "Hatalı giriş",
  LOGIN_BLOCKED: "Giriş engellendi (kilit)",
  LOGIN_DISABLED_ACCOUNT: "Kapalı hesapla giriş denemesi",
  LOGOUT: "Çıkış",
  LOGOUT_ALL: "Tüm oturumlardan çıkış",
  SESSION_REVOKED: "Oturum kapatıldı",
  OTHER_SESSIONS_REVOKED: "Diğer oturumlar kapatıldı",
  TOKEN_REUSE_DETECTED: "Token tekrar kullanıldı (hırsızlık şüphesi)",

  // Şifre
  PASSWORD_CHANGED: "Şifre değiştirildi",
  PASSWORD_CHANGE_FAILED: "Şifre değişikliği başarısız",
  PASSWORD_RESET_REQUESTED: "Şifre sıfırlama istendi",
  PASSWORD_RESET_BLOCKED: "Şifre sıfırlama engellendi (kota)",
  PASSWORD_RESET_COMPLETED: "Şifre sıfırlandı",
  PASSWORD_RESET_FAILED: "Şifre sıfırlama başarısız",

  // E-posta
  EMAIL_VERIFICATION_REQUESTED: "E-posta doğrulaması istendi",
  EMAIL_VERIFIED: "E-posta doğrulandı",
  EMAIL_VERIFICATION_FAILED: "E-posta doğrulaması başarısız",
  EMAIL_CHANGE_REQUESTED: "E-posta değişikliği istendi",
  EMAIL_CHANGED: "E-posta değişti",
  EMAIL_CHANGE_FAILED: "E-posta değişikliği başarısız",

  // Profil
  PROFILE_UPDATED: "Profil güncellendi",
  USERNAME_CHANGED: "Kullanıcı adı değişti",
  AVATAR_UPDATED: "Profil fotoğrafı değiştirildi",
  AVATAR_REMOVED: "Profil fotoğrafı kaldırıldı",

  // Sosyal giriş
  SOCIAL_ACCOUNT_LINKED: "Sosyal hesap bağlandı",
  SOCIAL_ACCOUNT_UNLINKED: "Sosyal hesap koparıldı",
  SOCIAL_LINK_FAILED: "Sosyal hesap bağlanamadı",

  // Hesap yaşam döngüsü
  ACCOUNT_SELF_DEACTIVATED: "Kullanıcı hesabını dondurdu",
  ACCOUNT_REACTIVATED: "Hesap yeniden etkinleştirildi",
  ACCOUNT_DELETION_REQUESTED: "Hesap silme istendi",
  ACCOUNT_DELETION_CANCELLED: "Hesap silme iptal edildi",
  ACCOUNT_ANONYMIZED: "Hesap anonimleştirildi",

  // Sözleşme ve rıza
  CONSENT_ACCEPTED: "Sözleşme onaylandı",
  CONSENT_WITHDRAWN: "Onay geri çekildi",
  LEGAL_DOCUMENT_PUBLISHED: "Sözleşme sürümü yayınlandı",

  // Yönetici işlemleri
  USER_CREATED_BY_ADMIN: "Hesap açıldı (yönetici)",
  ACCOUNT_DISABLED: "Hesap kapatıldı (yönetici)",
  ACCOUNT_ENABLED: "Hesap açıldı (yönetici)",
  ROLE_CHANGED: "Rol değiştirildi",
  PROFILE_UPDATED_BY_ADMIN: "Profil güncellendi (yönetici)",
  AVATAR_REMOVED_BY_ADMIN: "Profil fotoğrafı kaldırıldı (yönetici)",
  SESSIONS_REVOKED_BY_ADMIN: "Oturumlar kapatıldı (yönetici)",
  SESSION_REVOKED_BY_ADMIN: "Tek oturum kapatıldı (yönetici)",
  USER_VIEWED_BY_ADMIN: "Üye kartı görüntülendi",
  UYE_NOTU_EKLENDI: "İç not yazıldı",
  UYE_NOTU_SILINDI: "İç not silindi",
  LOGIN_LOCK_CLEARED_BY_ADMIN: "Giriş kilidi açıldı (yönetici)",
  TELEPUAN_ADJUSTED_BY_ADMIN: "Telepuan değiştirildi (yönetici)",
  MARKET_PRODUCT_SAVED_BY_ADMIN: "Market ürünü kaydedildi",
  MARKET_ORDER_UPDATED_BY_ADMIN: "Market siparişi güncellendi",
  CHAT_MESSAGE_DELETED_BY_ADMIN: "Sohbet mesajı silindi (yönetici)",
  CHAT_REPORT_DISMISSED_BY_ADMIN: "Sohbet şikayeti yersiz bulundu",
  ONAY_ROZETI_DEGISTI: "Onay rozeti değiştirildi",
  KULLANICI_SUSTURULDU: "Kullanıcı susturuldu / susturma kalktı",
  GONDERI_DELETED_BY_ADMIN: "Gönderi silindi (yönetici)",
  YORUM_DELETED_BY_ADMIN: "Yorum silindi (yönetici)",
  GONDERI_REPORT_DISMISSED_BY_ADMIN: "Gönderi şikayeti yersiz bulundu",
  AUDIT_LOG_VIEWED: "Denetim kaydı görüntülendi",

  // Panel içerik ve ayar işlemleri
  ONE_CIKAN_LIG_DEGISTI: "Öne çıkan ligler değiştirildi",
  UYGULAMA_AYARI_DEGISTI: "Uygulama ayarı değiştirildi",
  MAC_OZETI_DEGISTI: "Maç özeti / nabız videosu değişti",
  DESTEK_CEVAPLANDI: "Destek talebi cevaplandı",
  DESTEK_DURUMU_DEGISTI: "Destek talebinin durumu değişti",
  DUYURU_GONDERILDI: "Duyuru gönderildi",
  SURUM_NOTU_DEGISTI: "Sürüm notu değişti",
  HABER_KAYDEDILDI: "Haber kaydedildi",
  HABER_SILINDI: "Haber silindi",
  HABER_ARAMA_MOTORUNA_BILDIRILDI: "Haber arama motorlarına bildirildi",
  CEVIRI_DUZELTILDI: "Çeviri düzeltildi",
  VERI_DUZELTILDI: "Veri düzeltildi",
  KADRO_DUZELTILDI: "Kadro düzeltildi",
  MOTOR_ISLEMI_CALISTIRILDI: "Veri işlemi elle çalıştırıldı",
  SAYAC_SIFIRLANDI: "Sayaçlar sıfırlandı",
  BILDIRIM_UZLASTIRILDI: "Bildirim abonelikleri uzlaştırıldı",
  ORANLAR_TAZELENDI: "Oranlar elle tazelendi",
  SITE_HARITASI_DEGISTI: "Site haritası ayarı değişti",

  // Bakım
  AUDIT_LOG_PRUNED: "Eski kayıtlar silindi",
};

/**
 * Süzgeç kutusunun üst grubu — yönetici işlemleri.
 *
 * <p>Ayrı grup çünkü asıl soru genelde bu: "panelden kim ne yaptı".
 * Kullanıcının kendi hareketleri (giriş, şifre değişimi) ikinci grupta ve
 * hacmi çok daha yüksek — karıştırılsaydı yönetici işlemleri arasında
 * kaybolurdu.
 */
export const YONETICI_OLAYLARI = [
  "USER_CREATED_BY_ADMIN",
  "ROLE_CHANGED",
  "TELEPUAN_ADJUSTED_BY_ADMIN",
  "MARKET_PRODUCT_SAVED_BY_ADMIN",
  "MARKET_ORDER_UPDATED_BY_ADMIN",
  "PROFILE_UPDATED_BY_ADMIN",
  "ACCOUNT_DISABLED",
  "ACCOUNT_ENABLED",
  "SESSIONS_REVOKED_BY_ADMIN",
  "SESSION_REVOKED_BY_ADMIN",
  "USER_VIEWED_BY_ADMIN",
  "UYE_NOTU_EKLENDI",
  "UYE_NOTU_SILINDI",
  "LOGIN_LOCK_CLEARED_BY_ADMIN",
  "AVATAR_REMOVED_BY_ADMIN",
  "CHAT_MESSAGE_DELETED_BY_ADMIN",
  "CHAT_REPORT_DISMISSED_BY_ADMIN",
  "LEGAL_DOCUMENT_PUBLISHED",
  "ONAY_ROZETI_DEGISTI",
  "KULLANICI_SUSTURULDU",
  "GONDERI_DELETED_BY_ADMIN",
  "YORUM_DELETED_BY_ADMIN",
  "GONDERI_REPORT_DISMISSED_BY_ADMIN",
  "HABER_KAYDEDILDI",
  "HABER_SILINDI",
  "HABER_ARAMA_MOTORUNA_BILDIRILDI",
  "DUYURU_GONDERILDI",
  "SURUM_NOTU_DEGISTI",
  "DESTEK_CEVAPLANDI",
  "DESTEK_DURUMU_DEGISTI",
  "ONE_CIKAN_LIG_DEGISTI",
  "UYGULAMA_AYARI_DEGISTI",
  "MAC_OZETI_DEGISTI",
  "CEVIRI_DUZELTILDI",
  "VERI_DUZELTILDI",
  "KADRO_DUZELTILDI",
  "MOTOR_ISLEMI_CALISTIRILDI",
  "ORANLAR_TAZELENDI",
  "SITE_HARITASI_DEGISTI",
  "BILDIRIM_UZLASTIRILDI",
  "SAYAC_SIFIRLANDI",
  "AUDIT_LOG_VIEWED",
  "AUDIT_LOG_PRUNED",
];

/** Kalanlar — kullanıcının kendi hareketleri, Türkçe ada göre sıralı. */
export const DIGER_OLAYLAR = Object.keys(OLAY_TR)
  .filter((k) => !YONETICI_OLAYLARI.includes(k))
  .sort((a, b) => OLAY_TR[a].localeCompare(OLAY_TR[b], "tr"));

/** Sunucunun kaynağı olmayan (zamanlanmış görev) kayıtlarına yazdığı IP. */
export const BILINMEYEN_IP = "bilinmiyor";

/** Kimse tarafından değil, sunucunun kendi görevince yazılmış satır. */
export function sistemSatiri(s: DenetimSatiri): boolean {
  return (
    s.actorUserId == null &&
    s.userId == null &&
    (s.ipAddress == null || s.ipAddress === BILINMEYEN_IP)
  );
}

/** Konu önekleri ("mac:7722", "haber#5") — okunur ada. Tanınmayan olduğu gibi. */
export const KONU_TR: Record<string, string> = {
  mac: "Maç",
  haber: "Haber",
  destek: "Destek talebi",
  duyuru: "Duyuru",
  "surum-notu": "Sürüm notu",
  kadro: "Kadro düzeltmesi",
  sozluk: "Sözlük",
  veri: "Veri",
  senkron: "Veri kaynağı",
  urun: "Market ürünü",
  siparis: "Sipariş",
  user: "Hesap",
  not: "İç not",
};

/** Öneksiz konular (tek kelime) — panelin hangi masasında yapıldı. */
export const TEK_KONU_TR: Record<string, string> = {
  kadro: "Kadro Masası",
  ceviri: "Çeviri Düzeltme",
  arsiv: "Arşiv",
  push: "Bildirim cihazları",
  oranlar: "Oranlar",
  "site-haritasi": "Site haritası",
  "db-usage": "Sorgu sayaçları",
  "motor-kullanimi": "Veri isteği sayaçları",
};

export function konuYaz(konu: string): string {
  if (TEK_KONU_TR[konu]) return TEK_KONU_TR[konu];
  const m = /^([a-z-]+)[:#](.+)$/i.exec(konu);
  if (!m) return konu;
  const ad = KONU_TR[m[1].toLowerCase()];
  if (!ad) return konu;
  return /^\d+$/.test(m[2]) ? `${ad} #${m[2]}` : `${ad}: ${m[2]}`;
}

/**
 * Ayrıntıdaki boş süzgeç izleri. 2 Ekim'den önceki görüntüleme kayıtları
 * "sorgu: userId=null event=null …" yazıyordu; kayıt değiştirilemez
 * (zincir), yalnız gösterimde temizlenir.
 */
export function ayrintiYaz(detay: string | null): string {
  if (!detay) return "—";
  let metin = detay;
  if (/\b\w+=null\b/.test(metin)) {
    metin = metin.replace(/\s*\b\w+=null\b/g, "").trim();
    if (metin === "sorgu:" || metin === "") return "liste açıldı (süzgeçsiz)";
    metin = metin
      .replace(/^sorgu:/, "süzgeç:")
      .replace(/\buserId=(\d+)/, "hesap #$1")
      .replace(/\bevent=/, "olay ")
      .replace(/\bip=/, "IP ")
      .replace(/\bfrom=/, "başlangıç ")
      .replace(/\bto=/, "bitiş ");
  }
  // Panelin gönderdiği gövde (JSON) "alan: değer · alan: değer" olarak.
  metin = metin.replace(/\{.*\}/, (j) => {
    try {
      const o = JSON.parse(j);
      if (!o || typeof o !== "object" || Array.isArray(o)) return j;
      return Object.entries(o)
        .filter(([, v]) => v !== null && v !== "")
        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
        .join(" · ");
    } catch {
      return j;
    }
  });
  // Ayrıntıda geçen olay kodu (süzgeç özeti) Türkçesiyle.
  return metin.replace(/\b[A-Z][A-Z_]{2,}\b/g, (k) => (OLAY_TR[k] ? `"${OLAY_TR[k]}"` : k));
}
