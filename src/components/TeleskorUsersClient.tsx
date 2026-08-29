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
  ApiError,
} from "@/lib/api-client";
import type {
  TeleskorUserSummary,
  TeleskorUserDetail,
  TeleskorPointAccount,
  TeleskorRole,
} from "@/lib/types";
import { formatDate } from "@/lib/format";

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
      if (e.key === "Escape") kapat();
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
  }, [secili]);

  function kapat() {
    setAcilan(null);
    setSecili(null);
    setPuanlar(null);
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

  async function rolDegistir(u: TeleskorUserDetail, rol: TeleskorRole) {
    const gerekce = prompt(
      `${u.username} kullanıcısının rolü "${ROL_TR[rol]}" yapılacak.\n\n` +
        "Gerekçe (denetim kaydına yazılır):",
      "",
    );
    if (!gerekce) return;
    setIslemde(true);
    try {
      await apiTeleskorChangeRole(u.id, rol, gerekce);
      await detayAc(u);
      await load();
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Rol değiştirilemedi.");
    } finally {
      setIslemde(false);
    }
  }

  async function durumIslemi(
    u: TeleskorUserDetail,
    islem: "disable" | "enable" | "revoke-sessions",
  ) {
    const baslik =
      islem === "disable"
        ? `${u.username} hesabı KAPATILACAK ve açık oturumları anında düşecek.`
        : islem === "enable"
          ? `${u.username} hesabı yeniden açılacak.`
          : `${u.username} kullanıcısının TÜM oturumları kapatılacak (hesap ele geçirilmiş şüphesi).`;
    const gerekce = prompt(`${baslik}\n\nGerekçe (denetim kaydına yazılır):`, "");
    if (!gerekce) return;
    setIslemde(true);
    try {
      await apiTeleskorUserStatus(u.id, islem, gerekce);
      await detayAc(u);
      await load();
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "İşlem tamamlanamadı.");
    } finally {
      setIslemde(false);
    }
  }

  async function puanIslemi(u: TeleskorUserDetail, isaret: 1 | -1) {
    const ham = prompt(
      isaret > 0
        ? `${u.username} kullanıcısına kaç Telepuan eklensin?`
        : `${u.username} kullanıcısından kaç Telepuan düşülsün?`,
      "",
    );
    if (!ham) return;
    const miktar = Number(ham.trim());
    if (!Number.isFinite(miktar) || miktar <= 0) {
      setHata("Miktar pozitif bir sayı olmalı.");
      return;
    }
    const aciklama =
      prompt(
        "Kullanıcının hareket listesinde GÖRECEĞİ açıklama:\n" +
          "(boş bırakılırsa 'Yönetici tarafından eklendi/düşüldü' yazar)",
        "",
      ) ?? "";
    const gerekce = prompt(
      "Gerekçe — yalnız denetim kaydına yazılır, kullanıcı GÖRMEZ:",
      "",
    );
    if (!gerekce) return;

    setIslemde(true);
    try {
      const r = await apiTeleskorAdjustPoints(
        u.id,
        miktar * isaret,
        aciklama,
        gerekce,
      );
      setPuanlar(await apiTeleskorPoints(u.id));
      setHata(null);
      alert(`Tamam. Yeni bakiye: ${r.bakiye} TP`);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Telepuan işlemi yapılamadı.");
    } finally {
      setIslemde(false);
    }
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
              onClick={() => puanIslemi(secili, 1)}
            >
              Telepuan Ekle
            </button>
            <button
              className="btn btn-sm"
              disabled={islemde}
              onClick={() => puanIslemi(secili, -1)}
            >
              Telepuan Düş
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
                      <td style={{ fontSize: 12.5 }}>{i.tur}</td>
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
    </div>
  );
}
