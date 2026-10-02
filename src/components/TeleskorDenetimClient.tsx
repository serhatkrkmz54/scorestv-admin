"use client";

import { useCallback, useEffect, useState } from "react";
import { apiDenetimListe, apiDenetimDogrula, ApiError } from "@/lib/api-client";
import type { DenetimSatiri, DenetimZinciri } from "@/lib/types";
import { formatDate } from "@/lib/format";

/**
 * DENETİM KAYDI — "kim, ne zaman, ne yaptı".
 *
 * <h3>Neden bu ekran gerekliydi</h3>
 * Panelden yapılan her yönetici işlemi (rol değişikliği, Telepuan verme,
 * sipariş iptali, üye düzenleme) gerekçesiyle birlikte denetim kaydına
 * yazılıyor — ama okunacak bir yer yoktu. Yazıp okunamaz bırakmak, kaydı
 * hiç tutmamaktan yalnızca biraz iyidir.
 *
 * <h3>Zincir doğrulaması</h3>
 * Her kayıt bir öncekinin SHA-256 özetini taşıyor. "Doğrula" düğmesi
 * zinciri baştan sona kontrol ediyor; {@code intact: false} kayıtların
 * sonradan değiştirildiği anlamına geliyor. Mahkemeye sunulacak bir
 * dökümün yanında bu çıktı da bulunmalı.
 *
 * <h3>Bu sayfanın kendisi de kayda geçiyor</h3>
 * Teleskor, denetim kaydını görüntülemeyi {@code AUDIT_LOG_VIEWED} olarak
 * yazıyor ("denetimin denetimi"). Yani her arama bir satır bırakıyor —
 * listede kendi izlerini görmek beklenen davranış, hata değil.
 */

/**
 * Denetim olaylarının Türkçesi — AuditEvent enum'unun TAMAMI (75 olay;
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
const OLAY_TR: Record<string, string> = {
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
const YONETICI_OLAYLARI = [
  "USER_CREATED_BY_ADMIN",
  "ROLE_CHANGED",
  "TELEPUAN_ADJUSTED_BY_ADMIN",
  "MARKET_PRODUCT_SAVED_BY_ADMIN",
  "MARKET_ORDER_UPDATED_BY_ADMIN",
  "PROFILE_UPDATED_BY_ADMIN",
  "ACCOUNT_DISABLED",
  "ACCOUNT_ENABLED",
  "SESSIONS_REVOKED_BY_ADMIN",
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
  "BILDIRIM_UZLASTIRILDI",
  "SAYAC_SIFIRLANDI",
  "AUDIT_LOG_VIEWED",
  "AUDIT_LOG_PRUNED",
];

/** Kalanlar — kullanıcının kendi hareketleri, Türkçe ada göre sıralı. */
const DIGER_OLAYLAR = Object.keys(OLAY_TR)
  .filter((k) => !YONETICI_OLAYLARI.includes(k))
  .sort((a, b) => OLAY_TR[a].localeCompare(OLAY_TR[b], "tr"));

/** Sunucunun kaynağı olmayan (zamanlanmış görev) kayıtlarına yazdığı IP. */
const BILINMEYEN_IP = "bilinmiyor";

/** Kimse tarafından değil, sunucunun kendi görevince yazılmış satır. */
function sistemSatiri(s: DenetimSatiri): boolean {
  return (
    s.actorUserId == null &&
    s.userId == null &&
    (s.ipAddress == null || s.ipAddress === BILINMEYEN_IP)
  );
}

/** Konu önekleri ("mac:7722", "haber#5") — okunur ada. Tanınmayan olduğu gibi. */
const KONU_TR: Record<string, string> = {
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
};

/** Öneksiz konular (tek kelime) — panelin hangi masasında yapıldı. */
const TEK_KONU_TR: Record<string, string> = {
  kadro: "Kadro Masası",
  ceviri: "Çeviri Düzeltme",
  arsiv: "Arşiv",
  push: "Bildirim cihazları",
  oranlar: "Oranlar",
  "db-usage": "Sorgu sayaçları",
  "motor-kullanimi": "Veri isteği sayaçları",
};

function konuYaz(konu: string): string {
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
function ayrintiYaz(detay: string | null): string {
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

export default function TeleskorDenetimClient() {
  const [satirlar, setSatirlar] = useState<DenetimSatiri[]>([]);
  const [toplam, setToplam] = useState(0);
  const [sayfa, setSayfa] = useState(0);
  const [olay, setOlay] = useState("");
  const [kullaniciId, setKullaniciId] = useState("");
  const [uygulanan, setUygulanan] = useState({ event: "", userId: "" });
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [zincir, setZincir] = useState<DenetimZinciri | null>(null);
  const [dogruluyor, setDogruluyor] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await apiDenetimListe({
        event: uygulanan.event || undefined,
        userId: uygulanan.userId || undefined,
        page: sayfa,
        size: 50,
      });
      setSatirlar(p.content);
      setToplam(p.totalElements);
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Kayıtlar alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [uygulanan, sayfa]);

  useEffect(() => {
    load();
  }, [load]);

  async function dogrula() {
    setDogruluyor(true);
    try {
      setZincir(await apiDenetimDogrula());
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Zincir doğrulanamadı.");
    } finally {
      setDogruluyor(false);
    }
  }

  function uygula() {
    setSayfa(0);
    setUygulanan({ event: olay, userId: kullaniciId.trim() });
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Denetim Kaydı</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Panelden yapılan her yönetici işlemi gerekçesiyle burada.{" "}
            <b>Bu sayfayı açmak da kayda geçiyor</b> — listede kendi izlerini
            görmen beklenen davranış.
          </div>
        </div>
        <button className="btn" disabled={dogruluyor} onClick={dogrula}>
          {dogruluyor ? "Doğrulanıyor…" : "Zinciri doğrula"}
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      {zincir && (
        <div className={`alert ${zincir.intact ? "alert-success" : "alert-error"}`}>
          {zincir.intact ? (
            <>
              <b>Zincir sağlam.</b> {zincir.checkedEntries} kayıt kontrol
              edildi (toplam {zincir.totalEverWritten} yazılmış).{" "}
              {formatDate(zincir.verifiedAt)}
            </>
          ) : (
            <>
              <b>ZİNCİR BOZUK — kayıtlar sonradan değiştirilmiş olabilir.</b>
              <ul style={{ margin: "6px 0 0 18px" }}>
                {zincir.problems.slice(0, 10).map((p, i) => (
                  <li key={i} style={{ fontSize: 12.5 }}>
                    {p}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="card card-pad">
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <select
            className="input"
            style={{ maxWidth: 280 }}
            value={olay}
            onChange={(e) => setOlay(e.target.value)}
          >
            <option value="">Tüm olaylar</option>
            <optgroup label="Yönetici işlemleri">
              {YONETICI_OLAYLARI.map((k) => (
                <option key={k} value={k}>
                  {OLAY_TR[k]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Kullanıcı hareketleri">
              {DIGER_OLAYLAR.map((k) => (
                <option key={k} value={k}>
                  {OLAY_TR[k]}
                </option>
              ))}
            </optgroup>
          </select>
          <input
            className="input"
            style={{ maxWidth: 180 }}
            value={kullaniciId}
            onChange={(e) => setKullaniciId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") uygula();
            }}
            placeholder="Hesap no (#)"
          />
          <button className="btn btn-sm" onClick={uygula}>
            Süz
          </button>
          {(uygulanan.event || uygulanan.userId) && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setOlay("");
                setKullaniciId("");
                setSayfa(0);
                setUygulanan({ event: "", userId: "" });
              }}
            >
              Temizle
            </button>
          )}
          <div style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 12.5 }}>
            {toplam} kayıt
          </span>
        </div>

        {loading ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Yükleniyor…
          </div>
        ) : satirlar.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Kayıt yok.
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 150 }}>Zaman</th>
                    <th>Olay</th>
                    <th style={{ width: 150 }}>Hedef</th>
                    <th style={{ width: 130 }}>Yapan</th>
                    <th>Ayrıntı</th>
                    <th style={{ width: 120 }}>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {satirlar.map((s) => {
                    const sistem = sistemSatiri(s);
                    const konu = s.subject && s.subject !== s.userName ? konuYaz(s.subject) : null;
                    return (
                    <tr key={s.id}>
                      <td style={{ fontSize: 12.5 }}>{formatDate(s.occurredAt)}</td>
                      <td style={{ fontSize: 12.5 }}>
                        <div style={{ fontWeight: 600 }}>
                          {OLAY_TR[s.event] ?? s.event}
                        </div>
                        {s.outcome !== "SUCCESS" && (
                          <span className="badge badge-archived">{s.outcome === "FAILURE" ? "Başarısız" : s.outcome}</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12.5, wordBreak: "break-word" }}>
                        {s.userId != null ? (
                          <>
                            <b>{s.userName ?? `Hesap #${s.userId}`}</b>
                            {s.userName && (
                              <span className="muted" style={{ fontSize: 11.5 }}> #{s.userId}</span>
                            )}
                          </>
                        ) : !konu ? (
                          "—"
                        ) : null}
                        {konu && (
                          <div className={s.userId != null ? "muted" : undefined} style={{ fontSize: s.userId != null ? 11.5 : 12.5 }}>
                            {konu}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12.5 }}>
                        {s.actorUserId != null ? (
                          <>
                            <b>{s.actorName ?? `Hesap #${s.actorUserId}`}</b>
                            {s.actorName && (
                              <span className="muted" style={{ fontSize: 11.5 }}> #{s.actorUserId}</span>
                            )}
                          </>
                        ) : sistem ? (
                          <span className="badge" style={{ whiteSpace: "nowrap" }}>Sistem (otomatik)</span>
                        ) : s.userId != null ? (
                          <span className="muted">Kullanıcının kendisi</span>
                        ) : (
                          <span className="muted">Oturumsuz istek</span>
                        )}
                      </td>
                      <td
                        style={{
                          fontSize: 12.5,
                          maxWidth: 320,
                          wordBreak: "break-word",
                        }}
                      >
                        {ayrintiYaz(s.detail)}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {s.ipAddress == null || s.ipAddress === BILINMEYEN_IP ? (
                          <span className="muted">{sistem ? "Sunucu" : "—"}</span>
                        ) : (
                          s.ipAddress
                        )}
                        {s.country && (
                          <div className="muted" style={{ fontSize: 11.5 }}>
                            {s.country}
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
                alignItems: "center",
              }}
            >
              <button
                className="btn btn-sm"
                disabled={sayfa === 0}
                onClick={() => setSayfa((s) => Math.max(0, s - 1))}
              >
                Önceki
              </button>
              <span className="muted" style={{ fontSize: 12.5 }}>
                Sayfa {sayfa + 1}
              </span>
              <button
                className="btn btn-sm"
                disabled={(sayfa + 1) * 50 >= toplam}
                onClick={() => setSayfa((s) => s + 1)}
              >
                Sonraki
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
