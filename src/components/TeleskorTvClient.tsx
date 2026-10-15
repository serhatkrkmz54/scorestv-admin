"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  apiTvDuzeltmeler,
  apiTvEkle,
  apiTvKaldir,
  apiTvMaclar,
  apiTvUlkeler,
  ApiError,
} from "@/lib/api-client";
import type { TvDefterSatiri, TvDuzeltme, TvMac, TvUlke } from "@/lib/types";

/**
 * TV KANALI DÜZELTME — sağlayıcının vermediği yayın kanalını maça ekler
 * (motor V118).
 *
 * <h3>Neden gerekli</h3>
 * Veri kaynağının maç TV listesi bazen eksik (Serhat, 15 Ekim: Aston Villa -
 * Fenerbahçe ATV'de, listede yok). Eklenen kanal uygulamanın maç
 * ekranındaki TV kartında, web'in maç sayfasında ve TV rehberinde hemen
 * görünüyor; uygulama güncellemesi gerekmiyor.
 *
 * <h3>Kural motorda</h3>
 * Kanal aynı ülkenin listesine katılıyor; kaynak aynı kanalı zaten veriyorsa
 * motor reddediyor (409). Kaynağın verdiği kanalı gizlemek bu ekranda yok.
 * Kaldırılan kayıt silinmiyor, defterde duruyor.
 */

const DURUM_ADI: Record<string, string> = {
  SCHEDULED: "Başlamadı",
  LIVE: "Canlı",
  HALF_TIME: "Devre arası",
  FINISHED: "Bitti",
  POSTPONED: "Ertelendi",
  CANCELLED: "İptal",
  INTERRUPTED: "Durduruldu",
  ABANDONED: "Yarıda kaldı",
};

const KANAL_EN_COK = 60;
const GEREKCE_EN_COK = 300;

/** Türkiye günü, YYYY-AA-GG. */
function bugun(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function saat(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tarihSaat(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function macAdi(m: { ev: { ad?: string }; dep: { ad?: string } }): string {
  return `${m.ev.ad ?? "?"} - ${m.dep.ad ?? "?"}`;
}

export default function TeleskorTvClient() {
  const [ulkeler, setUlkeler] = useState<TvUlke[]>([]);
  const [gun, setGun] = useState(bugun);
  const [arama, setArama] = useState("");
  const [maclar, setMaclar] = useState<TvMac[]>([]);
  const [araniyor, setAraniyor] = useState(false);
  const [aramaHatasi, setAramaHatasi] = useState("");

  const [hata, setHata] = useState("");
  const [bilgi, setBilgi] = useState("");

  const [defter, setDefter] = useState<TvDefterSatiri[]>([]);
  const [defterKaldirilan, setDefterKaldirilan] = useState(false);

  // Açık form: hangi maça ekleniyor.
  const [formMac, setFormMac] = useState<TvMac | null>(null);
  const [ulkeId, setUlkeId] = useState<number | null>(null);
  const [kanal, setKanal] = useState("");
  const [gerekce, setGerekce] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [formHatasi, setFormHatasi] = useState("");
  const mesajKutusu = useRef<HTMLDivElement>(null);

  // Varsayılan ülke: sağlayıcı adı "Turkey" olan, en çok kullanılan (liste
  // zaten kullanıma göre sıralı). Katalogda iki "Turkey" var; motor yalnız TV
  // listelerinde geçeni veriyor.
  const varsayilanUlke = useMemo(
    () => ulkeler.find((u) => u.kod === "Turkey")?.id ?? ulkeler[0]?.id ?? null,
    [ulkeler],
  );

  useEffect(() => {
    apiTvUlkeler()
      .then(setUlkeler)
      .catch((e) => setHata(e instanceof ApiError ? e.message : "Ülke listesi alınamadı."));
  }, []);

  const defteriYukle = useCallback(async (kaldirilan: boolean) => {
    try {
      setDefter(await apiTvDuzeltmeler(kaldirilan));
    } catch (e) {
      setDefter([]);
      setHata(e instanceof ApiError ? e.message : "Kayıtlar alınamadı.");
    }
  }, []);

  useEffect(() => {
    void defteriYukle(defterKaldirilan);
  }, [defterKaldirilan, defteriYukle]);

  const maclariYukle = useCallback(async (g: string, q: string) => {
    const temiz = q.trim();
    if (temiz.length < 2 && !/^\d+$/.test(temiz)) {
      setMaclar([]);
      setAramaHatasi("");
      return;
    }
    setAraniyor(true);
    try {
      setMaclar(await apiTvMaclar(g, temiz));
      setAramaHatasi("");
    } catch (e) {
      setMaclar([]);
      setAramaHatasi(e instanceof ApiError ? e.message : "Maçlar alınamadı.");
    } finally {
      setAraniyor(false);
    }
  }, []);

  // Arama 350 ms bekletici; bayat sonuç ekrana basılmıyor.
  useEffect(() => {
    let iptal = false;
    const z = setTimeout(() => {
      if (!iptal) void maclariYukle(gun, arama);
    }, 350);
    return () => {
      iptal = true;
      clearTimeout(z);
    };
  }, [gun, arama, maclariYukle]);

  function formuAc(m: TvMac) {
    setFormMac(m);
    setUlkeId(varsayilanUlke);
    setKanal("");
    setGerekce("");
    setFormHatasi("");
    setBilgi("");
  }

  function formuKapat() {
    setFormMac(null);
    setFormHatasi("");
  }

  async function sonrasi(mesaj: string) {
    setBilgi(mesaj);
    setHata("");
    formuKapat();
    await Promise.all([maclariYukle(gun, arama), defteriYukle(defterKaldirilan)]);
    mesajKutusu.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function ekle() {
    if (!formMac) return;
    if (ulkeId == null) {
      setFormHatasi("Ülke seçin.");
      return;
    }
    if (!kanal.trim()) {
      setFormHatasi("Kanal adını yazın.");
      return;
    }
    if (!gerekce.trim()) {
      setFormHatasi("Gerekçe zorunlu: bu bilgiyi nereden aldın?");
      return;
    }
    setGonderiliyor(true);
    setFormHatasi("");
    try {
      const d = await apiTvEkle({
        macId: formMac.macId,
        ulkeId,
        kanal: kanal.trim(),
        gerekce: gerekce.trim(),
      });
      await sonrasi(`${macAdi(formMac)}: "${d.kanal}" eklendi (${d.ulke ?? "ülke"}).`);
    } catch (e) {
      setFormHatasi(e instanceof ApiError ? e.message : "Kanal eklenemedi.");
    } finally {
      setGonderiliyor(false);
    }
  }

  async function kaldir(d: TvDuzeltme, ad: string) {
    if (!window.confirm(`${ad}: "${d.kanal}" kaldırılsın mı? Kanal uygulamadan ve web'den kalkar.`)) {
      return;
    }
    setHata("");
    try {
      await apiTvKaldir(d.id);
      await sonrasi(`${ad}: "${d.kanal}" kaldırıldı.`);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Kanal kaldırılamadı.");
    }
  }

  const seciliUlke = ulkeler.find((u) => u.id === varsayilanUlke);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
      <div className="card card-pad">
        <div className="card-title">TV Kanalı Düzeltme</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          Veri kaynağının vermediği yayın kanalını maça ekleyin. Kanal uygulamanın maç ekranında,
          web'in maç sayfasında ve TV rehberinde hemen görünür; kaynağın verdiği kanallara
          dokunulmaz. Kaynak aynı kanalı zaten veriyorsa eklenmez.
        </p>
      </div>

      <div ref={mesajKutusu}>
        {hata && <div className="alert alert-error">{hata}</div>}
        {bilgi && <div className="alert alert-success">{bilgi}</div>}
      </div>

      {/* ---------- Maç bulma ---------- */}
      <div className="card card-pad">
        <div className="card-title">Maç bul</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginTop: 10,
          }}
        >
          <label>
            <div className="label">Gün</div>
            <input
              className="input"
              type="date"
              value={gun}
              onChange={(e) => setGun(e.target.value || bugun())}
            />
          </label>
          <label>
            <div className="label">Takım adı ya da maç kimliği</div>
            <input
              className="input"
              placeholder="ör. Fenerbahçe"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
            />
          </label>
        </div>

        {aramaHatasi && (
          <div className="alert alert-error" style={{ marginTop: 10 }}>
            {aramaHatasi}
          </div>
        )}
        {araniyor && (
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
            Aranıyor…
          </p>
        )}
        {!araniyor && !aramaHatasi && arama.trim().length >= 2 && maclar.length === 0 && (
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
            Bu günde eşleşen maç yok.
          </p>
        )}

        {maclar.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {maclar.map((m) => {
              const seciliBlok = m.saglayici.filter(
                (y) => (seciliUlke && y.kod === seciliUlke.kod) || y.ulkeId === varsayilanUlke,
              );
              const seciliKanallar = seciliBlok.flatMap((y) => y.kanallar);
              const digerler = m.saglayici.filter((y) => !seciliBlok.includes(y));
              const formAcik = formMac?.macId === m.macId;
              return (
                <div
                  key={m.macId}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div className="cell-title">{macAdi(m)}</div>
                      <div className="cell-sub">
                        {saat(m.baslama)} · {m.lig ?? "Lig bilinmiyor"} ·{" "}
                        {DURUM_ADI[m.durum ?? ""] ?? m.durum ?? "—"} · #{m.macId}
                      </div>
                    </div>
                    {!formAcik && (
                      <button className="btn btn-primary btn-sm" onClick={() => formuAc(m)}>
                        Kanal ekle
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: 13, marginTop: 8 }}>
                    <span className="muted">
                      Kaynaktan{seciliUlke ? ` (${seciliUlke.ad})` : ""}:{" "}
                    </span>
                    {seciliKanallar.length > 0 ? seciliKanallar.join(", ") : <span className="muted">yok</span>}
                    {digerler.length > 0 && (
                      <details style={{ marginTop: 4 }}>
                        <summary className="muted" style={{ cursor: "pointer" }}>
                          Diğer ülkeler ({digerler.length})
                        </summary>
                        <ul style={{ margin: "6px 0 0 16px" }}>
                          {digerler.map((y, i) => (
                            <li key={`${y.ulkeId ?? "x"}-${i}`}>
                              {y.ulke ?? "Ülke belirsiz"}: {y.kanallar.join(", ") || "—"}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>

                  {m.elle.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                      {m.elle.map((d) => (
                        <div
                          key={d.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            flexWrap: "wrap",
                            fontSize: 13,
                          }}
                        >
                          <span>
                            <b>{d.kanal}</b>{" "}
                            <span className="muted">
                              · elle · {d.ulke ?? ""} · {d.olusturan ?? "—"}, {tarihSaat(d.olusturuldu)}
                            </span>
                          </span>
                          <button className="btn btn-sm" onClick={() => kaldir(d, macAdi(m))}>
                            Kaldır
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {formAcik && (
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: "1px solid var(--border)",
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: 12,
                        }}
                      >
                        <label>
                          <div className="label">Ülke</div>
                          <select
                            className="select"
                            value={ulkeId ?? ""}
                            onChange={(e) => setUlkeId(e.target.value ? Number(e.target.value) : null)}
                          >
                            {ulkeler.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.ad}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <div className="label">
                            Kanal adı <span className="req">*</span>
                          </div>
                          <input
                            className="input"
                            placeholder="ör. ATV"
                            maxLength={KANAL_EN_COK}
                            value={kanal}
                            onChange={(e) => setKanal(e.target.value)}
                          />
                        </label>
                      </div>
                      <label>
                        <div className="label">
                          Gerekçe <span className="req">*</span>
                        </div>
                        <input
                          className="input"
                          placeholder="Bu bilgiyi nereden aldın? ör. kanalın yayın akışı"
                          maxLength={GEREKCE_EN_COK}
                          value={gerekce}
                          onChange={(e) => setGerekce(e.target.value)}
                        />
                      </label>
                      {formHatasi && <div className="alert alert-error">{formHatasi}</div>}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-primary btn-sm" disabled={gonderiliyor} onClick={ekle}>
                          {gonderiliyor ? "Kaydediliyor…" : "Kaydet"}
                        </button>
                        <button className="btn btn-ghost btn-sm" disabled={gonderiliyor} onClick={formuKapat}>
                          Vazgeç
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------- Defter ---------- */}
      <div className="card card-pad">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div className="card-title">Elle eklenen kanallar</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className={`btn btn-sm ${!defterKaldirilan ? "btn-primary" : ""}`}
              onClick={() => setDefterKaldirilan(false)}
            >
              Yayında olanlar
            </button>
            <button
              className={`btn btn-sm ${defterKaldirilan ? "btn-primary" : ""}`}
              onClick={() => setDefterKaldirilan(true)}
            >
              Son kaldırılanlar
            </button>
          </div>
        </div>
        {defter.length === 0 ? (
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
            {defterKaldirilan ? "Son 90 günde kaldırılan kanal yok." : "Elle eklenmiş kanal yok."}
          </p>
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Maç</th>
                  <th>Ülke</th>
                  <th>Kanal</th>
                  <th>Gerekçe</th>
                  <th>Ekleyen</th>
                  <th style={{ width: 100 }} />
                </tr>
              </thead>
              <tbody>
                {defter.map((s) => (
                  <tr key={s.kayit.id}>
                    <td>
                      <div className="cell-title">{macAdi(s)}</div>
                      <div className="cell-sub">
                        {tarihSaat(s.baslama)} · #{s.kayit.macId}
                      </div>
                    </td>
                    <td>{s.kayit.ulke ?? "—"}</td>
                    <td>
                      <b>{s.kayit.kanal}</b>
                    </td>
                    <td style={{ maxWidth: 320 }}>{s.kayit.gerekce}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {s.kayit.olusturan ?? "—"}
                      <div className="cell-sub">{tarihSaat(s.kayit.olusturuldu)}</div>
                      {s.kayit.kaldirildi && (
                        <div className="cell-sub">
                          Kaldırıldı: {tarihSaat(s.kayit.kaldirildi)}
                          {s.kayit.kaldiran ? ` · ${s.kayit.kaldiran}` : ""}
                        </div>
                      )}
                    </td>
                    <td>
                      {!s.kayit.kaldirildi && (
                        <button className="btn btn-sm" onClick={() => kaldir(s.kayit, macAdi(s))}>
                          Kaldır
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
