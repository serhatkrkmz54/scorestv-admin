"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiTeleskorUsers,
  apiTeleskorUser,
  apiTeleskorCreateUser,
  apiTeleskorChangeRole,
  apiTeleskorUserStatus,
  apiTeleskorPoints,
  apiTeleskorAdjustPoints,
  apiTeleskorUserDuzenle,
  apiTeleskorKilitAc,
  apiTeleskorAvatarSil,
  ApiError,
} from "@/lib/api-client";
import type {
  TeleskorUserSummary,
  TeleskorUserDetail,
  TeleskorPointAccount,
  TeleskorRole,
} from "@/lib/types";
import { formatDate } from "@/lib/format";
import TeleskorOnayModal from "./TeleskorOnayModal";

const ROL_TR: Record<TeleskorRole, string> = {
  USER: "Üye",
  EDITOR: "Editör",
  ADMIN: "Yönetici",
};

const DURUM_TR: Record<string, string> = {
  ACTIVE: "Aktif",
  SELF_DEACTIVATED: "Kendi dondurdu",
  SUSPENDED: "Kapatıldı",
  DELETION_PENDING: "Silme bekliyor",
  ANONYMIZED: "Anonimleştirildi",
};

/**
 * Telepuan hareket türlerinin Türkçesi.
 *
 * <p>Sunucu ham kodu döndürüyor (`CARK_ODUL`) — bilerek: tür metin olarak
 * saklanıyor ve yeni tür eklemek ALTER TABLE istemesin diye enum değil.
 * Çeviri gösterim tarafının işi.
 *
 * <p>TANINMAYAN TÜR HAM GÖSTERİLİYOR, gizlenmiyor: sunucuya yeni bir tür
 * eklendiğinde ekranda boşluk değil kodun kendisi çıksın ve buraya
 * eklenmesi gerektiği görünsün.
 */
const TUR_TR: Record<string, string> = {
  KAYIT_BONUS: "Hoş geldin bonusu",
  CARK_ODUL: "Günlük çark",
  ANKET_KATILIM: "Skor tahmini katılımı",
  ANKET_IADE: "Skor tahmini iadesi",
  ANKET_ODUL: "Skor tahmini ödülü",
  MVP_ODUL: "Maçın oyuncusu ödülü",
  MARKET_ALIM: "Market alışverişi",
  MARKET_IADE: "Market iadesi",
  ADMIN_EKLEME: "Yönetici ekledi",
  ADMIN_DUSME: "Yönetici düştü",
};

const BOS_YENI = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  password: "",
  phone: "",
  role: "USER" as TeleskorRole,
  reason: "",
};

/**
 * TELESKOR — üye yönetimi.
 *
 * <p>ScoresTV'nin "Üyeler" ekranıyla karıştırma: ayrı servis, ayrı
 * veritabanı, ayrı roller. Aynı e-posta iki sistemde iki farklı kişi
 * olabilir.
 *
 * <p>Her yıkıcı işlem <b>gerekçe</b> istiyor — Teleskor tarafında zorunlu
 * ve zincirli denetim kaydına yazılıyor. Gerekçe kutusu boş bırakılamıyor;
 * bu bir form nezaketi değil, sunucunun şartı.
 */
export default function TeleskorUsersClient() {
  const [rows, setRows] = useState<TeleskorUserSummary[]>([]);
  const [toplam, setToplam] = useState(0);
  const [sayfa, setSayfa] = useState(0);
  const [arama, setArama] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  /// AÇILAN üye — modalı ANINDA açmak için.
  ///
  /// `secili` ancak iki istek dönünce doluyor; modal yalnız ona baksaydı
  /// "Aç"a basıldıktan sonra bir süre hiçbir şey olmamış gibi görünürdü.
  /// Bu alan dokunulur dokunulmaz doluyor, modal açılıyor ve içinde
  /// "Yükleniyor…" yazıyor.
  const [acilan, setAcilan] = useState<TeleskorUserSummary | null>(null);
  const [secili, setSecili] = useState<TeleskorUserDetail | null>(null);
  const [puanlar, setPuanlar] = useState<TeleskorPointAccount | null>(null);
  const [yeniAcik, setYeniAcik] = useState(false);
  const [yeni, setYeni] = useState({ ...BOS_YENI });
  const [islemde, setIslemde] = useState(false);

  // DÜZENLEME FORMU — modal içinde açılıyor, ayrı pencere DEĞİL.
  // Üçüncü bir katman (detay modalı > düzenleme modalı > onay modalı)
  // Esc sırasını da kapatma davranışını da anlaşılmaz kılardı.
  const [duzenle, setDuzenle] = useState<{
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    phone: string;
    reason: string;
  } | null>(null);

  // TELEPUAN MODALI. Eskiden üç ayrı prompt() zinciriydi (miktar →
  // açıklama → gerekçe): tarayıcının kendi kutusu, geri dönüş yok, yanlış
  // yazınca baştan. Üçü tek formda.
  const [puanModal, setPuanModal] = useState<1 | -1 | null>(null);

  // GEREKÇE MODALI — rol değiştirme ve hesap işlemleri için.
  // `onayla` durumda tutuluyor: her çağıran kendi işini veriyor, modal
  // yalnız gerekçeyi topluyor.
  const [onayModal, setOnayModal] = useState<{
    baslik: string;
    uyari: string;
    onayla: (gerekce: string) => Promise<void>;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await apiTeleskorUsers({ q, page: sayfa, size: 20 });
      setRows(p.content);
      setToplam(p.totalElements);
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Üyeler alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [q, sayfa]);

  useEffect(() => {
    load();
  }, [load]);

  // MODAL AÇIKKEN: Esc kapatıyor, arka plan KAYDIRILMIYOR.
  //
  // İkincisi görsel bir ayrıntı değil: kilit olmasaydı modalın içindeki
  // hareket listesinin sonuna gelince tekerlek arkadaki üye tablosunu
  // kaydırmaya başlardı ve modal kapanınca liste bambaşka bir yerde
  // olurdu.
  useEffect(() => {
    if (!secili) return;
    const onKey = (e: KeyboardEvent) => {
      // ÜSTTEKİ modal varsa Esc onu kapatıyor; detay modalı açık kalıyor.
      // Tek kural olsaydı "vazgeç"e basmak yerine Esc'e basan kullanıcı
      // iki pencereyi birden kapatır ve baştan başlardı.
      if (e.key !== "Escape") return;
      if (puanModal !== null) {
        setPuanModal(null);
        return;
      }
      if (onayModal) {
        setOnayModal(null);
        return;
      }
      kapat();
    };
    window.addEventListener("keydown", onKey);
    const oncekiOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      // Eski değere DÖNÜLÜYOR, boşaltılmıyor: başka bir yer kilidi
      // koymuşsa onu kaldırmış olurduk.
      document.body.style.overflow = oncekiOverflow;
    };
  }, [secili, puanModal, onayModal]);

  function kapat() {
    setAcilan(null);
    setSecili(null);
    setPuanlar(null);
    setDuzenle(null);
  }

  async function detayAc(u: TeleskorUserSummary) {
    // Modal ANINDA açılıyor; içerik geldikçe doluyor.
    setAcilan(u);
    setSecili(null);
    setPuanlar(null);
    try {
      // İkisi PARALEL: sıralı olsaydı pencere iki gidiş-dönüş bekletirdi
      // ve ikisi birbirine bağlı değil.
      const [d, p] = await Promise.all([
        apiTeleskorUser(u.id),
        apiTeleskorPoints(u.id),
      ]);
      setSecili(d);
      setPuanlar(p);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Üye açılamadı.");
    }
  }

  function rolDegistir(u: TeleskorUserDetail, rol: TeleskorRole) {
    setOnayModal({
      baslik: `Rolü "${ROL_TR[rol]}" yap`,
      uyari:
        rol === "ADMIN"
          ? `${u.username} TÜM yönetim uçlarına erişecek. Rol değişikliği ` +
            "kullanıcının oturumlarını yenilenmeye zorlar."
          : `${u.username} kullanıcısının rolü değişecek ve oturumları ` +
            "yenilenmeye zorlanacak.",
      onayla: async (gerekce) => {
        await apiTeleskorChangeRole(u.id, rol, gerekce);
        await detayAc(u);
        await load();
      },
    });
  }

  function durumIslemi(
    u: TeleskorUserDetail,
    islem: "disable" | "enable" | "revoke-sessions",
  ) {
    const [baslik, uyari] =
      islem === "disable"
        ? [
            "Hesabı kapat",
            `${u.username} hesabı kapatılacak ve açık oturumları ANINDA düşecek.`,
          ]
        : islem === "enable"
          ? ["Hesabı aç", `${u.username} hesabı yeniden açılacak.`]
          : [
              "Oturumları kapat",
              `${u.username} kullanıcısının TÜM oturumları kapatılacak. ` +
                "Hesap ele geçirilmiş şüphesinde kullanılır; kullanıcı her " +
                "cihazda yeniden giriş yapmak zorunda kalır.",
            ];
    setOnayModal({
      baslik,
      uyari,
      onayla: async (gerekce) => {
        await apiTeleskorUserStatus(u.id, islem, gerekce);
        await detayAc(u);
        await load();
      },
    });
  }

  function kilitAc(u: TeleskorUserDetail) {
    setOnayModal({
      baslik: "Kaba kuvvet kilidini aç",
      uyari:
        `${u.username} şifresini üst üste yanlış girdiği için 15 dakika ` +
        "bekliyor olabilir. Kilit açılınca hemen deneyebilir.",
      onayla: async (gerekce) => {
        await apiTeleskorKilitAc(u.id, gerekce);
      },
    });
  }

  function avatarSil(u: TeleskorUserDetail) {
    setOnayModal({
      baslik: "Profil fotoğrafını kaldır",
      uyari:
        `${u.username} kullanıcısının profil fotoğrafı silinecek. ` +
        "Yönetici kullanıcı adına fotoğraf YÜKLEYEMEZ — bu işlem yalnız " +
        "moderasyon için, geri alınamaz.",
      onayla: async (gerekce) => {
        await apiTeleskorAvatarSil(u.id, gerekce);
        await detayAc(u);
      },
    });
  }

  function duzenlemeAc(u: TeleskorUserDetail) {
    setDuzenle({
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      username: u.username,
      email: u.email,
      phone: u.phone ?? "",
      reason: "",
    });
  }

  async function duzenlemeKaydet(u: TeleskorUserDetail) {
    if (!duzenle) return;
    if (!duzenle.reason.trim()) {
      setHata("Gerekçe zorunlu.");
      return;
    }
    setIslemde(true);
    try {
      // BOŞ ALAN GÖNDERİLMİYOR: güncelleme kısmi ve boş metin "sil" demek.
      // Hepsini göndermek, dokunulmayan alanları da yeniden yazardı.
      const veri: Record<string, string> = { reason: duzenle.reason.trim() };
      if (duzenle.firstName.trim()) veri.firstName = duzenle.firstName.trim();
      if (duzenle.lastName.trim()) veri.lastName = duzenle.lastName.trim();
      if (duzenle.username.trim()) veri.username = duzenle.username.trim();
      if (duzenle.email.trim()) veri.email = duzenle.email.trim();
      if (duzenle.phone.trim()) veri.phone = duzenle.phone.trim();
      await apiTeleskorUserDuzenle(u.id, veri as never);
      setDuzenle(null);
      await detayAc(u);
      await load();
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Güncellenemedi.");
    } finally {
      setIslemde(false);
    }
  }

  async function puanUygula(
    isaret: 1 | -1,
    miktar: number,
    aciklama: string,
    gerekce: string,
  ) {
    if (!secili) return;
    const r = await apiTeleskorAdjustPoints(
      secili.id,
      miktar * isaret,
      aciklama,
      gerekce,
    );
    // Bakiye SUNUCUDAN geliyor, ekranda çıkarılmıyor: aynı kullanıcıya
    // başka bir yerden puan verilmiş olabilir ve para gösteren bir alan
    // yanlış olamaz.
    setPuanlar(await apiTeleskorPoints(secili.id));
    return r.bakiye;
  }

  async function hesapAc() {
    if (!yeni.reason.trim()) {
      setHata("Gerekçe zorunlu.");
      return;
    }
    setIslemde(true);
    try {
      await apiTeleskorCreateUser({
        ...yeni,
        phone: yeni.phone.trim() || null,
      });
      setYeniAcik(false);
      setYeni({ ...BOS_YENI });
      setHata(null);
      await load();
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Hesap açılamadı.");
    } finally {
      setIslemde(false);
    }
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Teleskor — Üyeler</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Teleskor’un kendi üye tablosu. ScoresTV üyeleriyle aynı değil —
            ayrı servis, ayrı veritabanı.
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setYeniAcik((v) => !v)}>
          {yeniAcik ? "Kapat" : "Yeni Hesap"}
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      {yeniAcik && (
        <div className="card card-pad">
          <div className="card-title">Yeni Hesap</div>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
            Şifreyi sen belirliyorsun ve kullanıcıya kendin iletiyorsun.
            Doğrulama e-postası <b>gönderilmez</b>; onay metinleri (KVKK,
            şartlar) kullanıcı ilk girişinde kendisi kabul eder — rıza
            başkası adına verilemez.
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="label">Ad</label>
              <input
                className="input"
                value={yeni.firstName}
                onChange={(e) => setYeni({ ...yeni, firstName: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label">Soyad</label>
              <input
                className="input"
                value={yeni.lastName}
                onChange={(e) => setYeni({ ...yeni, lastName: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label">Kullanıcı adı</label>
              <input
                className="input"
                value={yeni.username}
                onChange={(e) => setYeni({ ...yeni, username: e.target.value })}
                placeholder="harfle başlar, a-z 0-9 _"
              />
            </div>
            <div className="field">
              <label className="label">E-posta</label>
              <input
                className="input"
                type="email"
                value={yeni.email}
                onChange={(e) => setYeni({ ...yeni, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label">Şifre</label>
              <input
                className="input"
                value={yeni.password}
                onChange={(e) => setYeni({ ...yeni, password: e.target.value })}
                placeholder="8+ karakter, 3 tür"
              />
            </div>
            <div className="field">
              <label className="label">Telefon (isteğe bağlı)</label>
              <input
                className="input"
                value={yeni.phone}
                onChange={(e) => setYeni({ ...yeni, phone: e.target.value })}
                placeholder="05321234567"
              />
            </div>
            <div className="field">
              <label className="label">Rol</label>
              <select
                className="input"
                value={yeni.role}
                onChange={(e) =>
                  setYeni({ ...yeni, role: e.target.value as TeleskorRole })
                }
              >
                <option value="USER">Üye</option>
                <option value="EDITOR">Editör</option>
                <option value="ADMIN">Yönetici</option>
              </select>
            </div>
            <div className="field">
              <label className="label">Gerekçe (zorunlu)</label>
              <input
                className="input"
                value={yeni.reason}
                onChange={(e) => setYeni({ ...yeni, reason: e.target.value })}
                placeholder="Destek ekibi hesabı"
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              className="btn btn-primary"
              disabled={islemde}
              onClick={hesapAc}
            >
              {islemde ? "Açılıyor…" : "Hesabı Aç"}
            </button>
          </div>
        </div>
      )}

      <div className="card card-pad">
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            className="input"
            style={{ maxWidth: 320 }}
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSayfa(0);
                setQ(arama.trim());
              }
            }}
            placeholder="Kullanıcı adı, e-posta, telefon, ad…"
          />
          <button
            className="btn btn-sm"
            onClick={() => {
              setSayfa(0);
              setQ(arama.trim());
            }}
          >
            Ara
          </button>
          <div style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 12.5, alignSelf: "center" }}>
            {toplam} üye
          </span>
        </div>

        {loading ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Yükleniyor…
          </div>
        ) : rows.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Kayıt yok.
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Üye</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th>Son giriş</th>
                  <th style={{ textAlign: "right" }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.username}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {u.email}
                        {!u.emailVerified && " · doğrulanmamış"}
                      </div>
                    </td>
                    <td>{ROL_TR[u.role] ?? u.role}</td>
                    <td>
                      <span
                        className={`badge ${
                          u.status === "ACTIVE"
                            ? "badge-published"
                            : "badge-archived"
                        }`}
                      >
                        {DURUM_TR[u.status] ?? u.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      {formatDate(u.lastLoginAt)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-sm" onClick={() => detayAc(u)}>
                        Aç
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}
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
                disabled={(sayfa + 1) * 20 >= toplam}
                onClick={() => setSayfa((s) => s + 1)}
              >
                Sonraki
              </button>
            </div>
          </>
        )}
      </div>

      {acilan && (
        // MODAL — eskiden sayfanın ALTINA açılıyordu ve kullanıcı kaydırmak
        // zorunda kalıyordu; uzun listelerde detayın açıldığı bile
        // görünmüyordu. Zemine tıklamak ve Esc kapatıyor (MediaPicker'daki
        // kalıbın aynısı).
        //
        // Koşul `acilan`, `secili` DEĞİL: başlık ve çerçeve listedeki
        // özetten hemen çiziliyor, gövde veri gelince doluyor.
        <div className="modal-overlay" onClick={() => kapat()}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="card-title" style={{ margin: 0 }}>
                {acilan.username}{" "}
                <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>
                  #{acilan.id} · {acilan.email}
                </span>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => kapat()}
              >
                Kapat
              </button>
            </div>

            {!secili ? (
              <div className="card-pad muted" style={{ fontSize: 13 }}>
                Yükleniyor…
              </div>
            ) : (
            <div className="card-pad">
          <div className="form-grid" style={{ marginTop: 10 }}>
            <div className="field">
              <label className="label">Ad Soyad</label>
              <div>{secili.displayName ?? "—"}</div>
            </div>
            <div className="field">
              <label className="label">Telefon</label>
              <div>{secili.phone ?? "—"}</div>
            </div>
            <div className="field">
              <label className="label">Rol</label>
              <div>{ROL_TR[secili.role] ?? secili.role}</div>
            </div>
            <div className="field">
              <label className="label">Durum</label>
              <div>{DURUM_TR[secili.status] ?? secili.status}</div>
            </div>
            <div className="field">
              <label className="label">Açık oturum</label>
              <div>{secili.activeSessions}</div>
            </div>
            <div className="field">
              <label className="label">Telepuan bakiyesi</label>
              <div style={{ fontWeight: 700 }}>
                {puanlar ? `${puanlar.bakiye} TP` : "…"}
              </div>
            </div>
          </div>

          <div
            style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}
          >
            <button
              className="btn btn-sm btn-success"
              disabled={islemde}
              onClick={() => setPuanModal(1)}
            >
              Telepuan Ekle
            </button>
            <button
              className="btn btn-sm"
              disabled={islemde}
              onClick={() => setPuanModal(-1)}
            >
              Telepuan Düş
            </button>
            <button
              className="btn btn-sm"
              disabled={islemde}
              onClick={() => duzenlemeAc(secili)}
            >
              Bilgileri düzenle
            </button>
            <button
              className="btn btn-sm"
              disabled={islemde}
              onClick={() => kilitAc(secili)}
            >
              Kilidi aç
            </button>
            <button
              className="btn btn-sm"
              disabled={islemde}
              onClick={() => avatarSil(secili)}
            >
              Fotoğrafı kaldır
            </button>
            <div style={{ width: 1, background: "var(--border)" }} />
            {(["USER", "EDITOR", "ADMIN"] as const)
              .filter((r) => r !== secili.role)
              .map((r) => (
                <button
                  key={r}
                  className="btn btn-sm"
                  disabled={islemde}
                  onClick={() => rolDegistir(secili, r)}
                >
                  {ROL_TR[r]} yap
                </button>
              ))}
            <div style={{ flex: 1 }} />
            <button
              className="btn btn-sm"
              disabled={islemde}
              onClick={() => durumIslemi(secili, "revoke-sessions")}
            >
              Oturumları kapat
            </button>
            {secili.status === "SUSPENDED" ? (
              <button
                className="btn btn-sm btn-success"
                disabled={islemde}
                onClick={() => durumIslemi(secili, "enable")}
              >
                Hesabı aç
              </button>
            ) : (
              <button
                className="btn btn-sm btn-danger"
                disabled={islemde}
                onClick={() => durumIslemi(secili, "disable")}
              >
                Hesabı kapat
              </button>
            )}
          </div>

          {duzenle && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                border: "1px solid var(--border)",
                borderRadius: 10,
              }}
            >
              <div className="card-title" style={{ fontSize: 13 }}>
                Bilgileri düzenle
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
                Boş bıraktığın alana <b>dokunulmaz</b>. E-posta değişirse
                doğrulama işareti sıfırlanır, kullanıcının tüm oturumları
                kapanır ve HEM ESKİ HEM YENİ adresine bildirim gider.
              </div>
              <div className="form-grid">
                <div className="field">
                  <label className="label">Ad</label>
                  <input
                    className="input"
                    value={duzenle.firstName}
                    onChange={(e) =>
                      setDuzenle({ ...duzenle, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label className="label">Soyad</label>
                  <input
                    className="input"
                    value={duzenle.lastName}
                    onChange={(e) =>
                      setDuzenle({ ...duzenle, lastName: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label className="label">Kullanıcı adı</label>
                  <input
                    className="input"
                    value={duzenle.username}
                    onChange={(e) =>
                      setDuzenle({ ...duzenle, username: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label className="label">E-posta</label>
                  <input
                    className="input"
                    value={duzenle.email}
                    onChange={(e) =>
                      setDuzenle({ ...duzenle, email: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label className="label">Telefon</label>
                  <input
                    className="input"
                    value={duzenle.phone}
                    onChange={(e) =>
                      setDuzenle({ ...duzenle, phone: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label className="label">Gerekçe (zorunlu)</label>
                  <input
                    className="input"
                    value={duzenle.reason}
                    onChange={(e) =>
                      setDuzenle({ ...duzenle, reason: e.target.value })
                    }
                    placeholder="Destek talebi — kullanıcı e-postasını değiştirdi"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button
                  className="btn btn-primary"
                  disabled={islemde}
                  onClick={() => duzenlemeKaydet(secili)}
                >
                  {islemde ? "Kaydediliyor…" : "Kaydet"}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setDuzenle(null)}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}

          {puanlar && puanlar.islemler.length > 0 && (
            <>
              <div className="card-title" style={{ marginTop: 18, fontSize: 13 }}>
                Son Telepuan hareketleri
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Tür</th>
                    <th>Açıklama</th>
                    <th style={{ textAlign: "right" }}>Miktar</th>
                  </tr>
                </thead>
                <tbody>
                  {puanlar.islemler.slice(0, 25).map((i, idx) => (
                    <tr key={idx}>
                      <td style={{ fontSize: 12.5 }}>{formatDate(i.tarih)}</td>
                      <td style={{ fontSize: 12.5 }}>
                        {TUR_TR[i.tur] ?? i.tur}
                      </td>
                      <td style={{ fontSize: 12.5 }}>{i.aciklama ?? "—"}</td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          color:
                            i.miktar >= 0 ? "var(--ok, #16a34a)" : "var(--danger, #dc2626)",
                        }}
                      >
                        {i.miktar > 0 ? "+" : ""}
                        {i.miktar}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
            </div>
            )}
          </div>
        </div>
      )}

      {puanModal !== null && secili && (
        <PuanModal
          isaret={puanModal}
          kullaniciAdi={secili.username}
          bakiye={puanlar?.bakiye ?? 0}
          onKapat={() => setPuanModal(null)}
          onUygula={async (miktar, aciklama, gerekce) => {
            const yeni = await puanUygula(puanModal, miktar, aciklama, gerekce);
            setPuanModal(null);
            setHata(null);
            return yeni;
          }}
        />
      )}

      {onayModal && (
        <TeleskorOnayModal
          baslik={onayModal.baslik}
          uyari={onayModal.uyari}
          alanEtiketi="Gerekçe (zorunlu)"
          alanIpucu="Denetim kaydına yazılır"
          onKapat={() => setOnayModal(null)}
          onOnayla={async (gerekce) => {
            await onayModal.onayla(gerekce);
            setOnayModal(null);
            setHata(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * TELEPUAN EKLE / DÜŞ.
 *
 * <h3>Açıklama ve gerekçe AYRI kutular — ve bu ayrım kritik</h3>
 * Açıklama kullanıcının hareket listesinde GÖRÜNÜYOR ("Yılbaşı
 * kampanyası"); gerekçe yalnız denetim kaydına giriyor ("destek talebi
 * #123 telafisi"). Tek kutu olsaydı ya iç not kullanıcıya sızardı ya da
 * denetim kaydı "neden" sorusunu cevaplayamazdı.
 */
function PuanModal({
  isaret,
  kullaniciAdi,
  bakiye,
  onKapat,
  onUygula,
}: {
  isaret: 1 | -1;
  kullaniciAdi: string;
  bakiye: number;
  onKapat: () => void;
  onUygula: (
    miktar: number,
    aciklama: string,
    gerekce: string,
  ) => Promise<number | undefined>;
}) {
  const [miktar, setMiktar] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [gerekce, setGerekce] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const sayi = Number(miktar.trim());
  const gecerli =
    Number.isFinite(sayi) && sayi > 0 && gerekce.trim().length > 0;
  const ekleme = isaret > 0;

  async function gonder() {
    if (!gecerli) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      await onUygula(sayi, aciklama.trim(), gerekce.trim());
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "İşlem yapılamadı.");
      setGonderiliyor(false);
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 110 }} onClick={onKapat}>
      <div
        className="modal"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="card-title" style={{ margin: 0 }}>
            {ekleme ? "Telepuan Ekle" : "Telepuan Düş"}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onKapat}>
            Kapat
          </button>
        </div>
        <div className="card-pad">
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>
            <b>{kullaniciAdi}</b> · şu anki bakiye <b>{bakiye} TP</b>
            {!ekleme && " · bakiye eksiye düşemez"}
          </div>

          {hata && <div className="alert alert-error">{hata}</div>}

          <div className="field">
            <label className="label">Miktar (TP)</label>
            <input
              className="input"
              type="number"
              min={1}
              autoFocus
              value={miktar}
              onChange={(e) => setMiktar(e.target.value)}
            />
          </div>

          <div className="field" style={{ marginTop: 10 }}>
            <label className="label">
              Açıklama — kullanıcı bunu GÖRÜR
            </label>
            <input
              className="input"
              maxLength={200}
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              placeholder={
                ekleme ? "Yılbaşı kampanyası" : "Yanlış verilen puan geri alındı"
              }
            />
          </div>

          <div className="field" style={{ marginTop: 10 }}>
            <label className="label">
              Gerekçe — yalnız denetim kaydına yazılır, kullanıcı GÖRMEZ
            </label>
            <input
              className="input"
              maxLength={300}
              value={gerekce}
              onChange={(e) => setGerekce(e.target.value)}
              placeholder="Destek talebi #123 telafisi"
            />
          </div>

          <div className="form-actions">
            <button
              className={`btn ${ekleme ? "btn-success" : "btn-danger"}`}
              disabled={!gecerli || gonderiliyor}
              onClick={gonder}
            >
              {gonderiliyor
                ? "Uygulanıyor…"
                : ekleme
                  ? `${sayi > 0 ? sayi : ""} TP Ekle`
                  : `${sayi > 0 ? sayi : ""} TP Düş`}
            </button>
            <button className="btn btn-ghost" onClick={onKapat}>
              Vazgeç
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
