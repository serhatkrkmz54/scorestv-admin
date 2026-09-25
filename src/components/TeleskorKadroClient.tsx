"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiKadroDuzeltmeler,
  apiKadroGeriAl,
  apiKadroKapatDene,
  apiKadroOyuncuAra,
  apiKadroTakim,
  apiKadroTakimAra,
  apiKadroTakimlar,
  apiKadroYaz,
  apiTeleskorLigAra,
  ApiError,
} from "@/lib/api-client";
import type {
  KadroAdayi,
  KadroDuzeltme,
  KadroOyuncuBulgusu,
  KadroTakimBulgusu,
  KadroTakimKadrosu,
  KadroTakimOzeti,
} from "@/lib/types";

/**
 * KADRO MASASI — takım kadrosunda elle düzeltme (motor V105).
 *
 * <h3>Neden gerekli</h3>
 * Sağlayıcının kadro listesi alt liglerde yanlış: ayrılan oyuncu listede
 * kalıyor, gelen konmuyor. Motor bunların çoğunu maç kadrolarından ve
 * transferlerden kendisi düzeltiyor (birleşik kadro). Kalanlar — hiç maça
 * çıkmamış ve başka yerde izi de olmayan liste oyuncuları, maça çıkmamış
 * yeni transferler — burada insan eliyle düzeltiliyor.
 *
 * <h3>Üç işlem</h3>
 * <ul>
 *   <li><b>Çıkar</b>: oyuncu bu takımın kadrosunda görünmez.</li>
 *   <li><b>Taşı</b>: oyuncu hedef takımın kadrosuna eklenir ve başka
 *       HİÇBİR takımın kadrosunda görünmez; oyuncu sayfasının takımı da
 *       değişir. Motorda tek satır (EKLE).</li>
 *   <li><b>Oyuncu ekle</b>: katalogda var olan bir oyuncuyu bu takıma
 *       ekler (taşımanın aynısı, bu takımın ekranından).</li>
 * </ul>
 * Kuralın çıkardığı bir oyuncu yanlış çıktıysa "Geri ekle" aynı EKLE'dir.
 *
 * <h3>Düzeltme kalıcı değil — sağlayıcı yetişince kapanır</h3>
 * Motor saatte bir bakıyor: kural düzeltmesiz de aynı sonuca varıyorsa
 * düzeltme kendiliğinden kapanıyor. Geri alınan ya da kapanan düzeltme
 * silinmiyor, defterde duruyor.
 *
 * <h3>Kural motorda</h3>
 * "Kaldı / çıktı / neden" bilgisi uygulamanın kadrosunu kuran sorgunun
 * kendisinden geliyor; burada ikinci bir kural yok.
 */

type Filtre = "kadro" | "supheli" | "cikan";

type Form =
  | { tur: "CIKAR"; aday: KadroAdayi }
  | { tur: "GERI_EKLE"; aday: KadroAdayi }
  | { tur: "TASI"; aday: KadroAdayi }
  | { tur: "EKLE" };

const MEVKILER: { kod: string; ad: string }[] = [
  { kod: "", ad: "Oyuncunun kendi mevkisi" },
  { kod: "G", ad: "Kaleci" },
  { kod: "D", ad: "Defans" },
  { kod: "M", ad: "Orta saha" },
  { kod: "F", ad: "Forvet" },
];

function tarih(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const KAYNAK_ADI: Record<KadroAdayi["geldigi"], string> = {
  SAGLAYICI: "Liste",
  MAC: "Maç kadrosu",
  ELLE: "Elle",
};

const KAPANMA_ADI: Record<string, string> = {
  SAGLAYICI_YETISTI: "Veri yetişti, gereksizleşti",
  GERI_ALINDI: "Geri alındı",
  YENISI_YAZILDI: "Yerine yenisi yazıldı",
  BASKA_TAKIMA_EKLENDI: "Oyuncu başka takıma eklendi",
};

export default function TeleskorKadroClient() {
  const [ligAramasi, setLigAramasi] = useState("");
  const [ligSecenekleri, setLigSecenekleri] = useState<
    { ligId: number; ad?: string | null; ulke?: string | null }[]
  >([]);
  const [lig, setLig] = useState<{ id: number; ad: string } | null>(null);

  const [takimlar, setTakimlar] = useState<KadroTakimOzeti[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [bilgi, setBilgi] = useState("");

  const [defter, setDefter] = useState<KadroDuzeltme[]>([]);
  const [defterKapali, setDefterKapali] = useState(false);

  const [acik, setAcik] = useState<{ id: number; ad: string } | null>(null);
  const [kadro, setKadro] = useState<KadroTakimKadrosu | null>(null);
  const [kadroYukleniyor, setKadroYukleniyor] = useState(false);
  const [filtre, setFiltre] = useState<Filtre>("kadro");

  const [form, setForm] = useState<Form | null>(null);
  const [gerekce, setGerekce] = useState("");
  const [mevki, setMevki] = useState("");
  const [forma, setForma] = useState("");
  const [takimArama, setTakimArama] = useState("");
  const [takimSonuclari, setTakimSonuclari] = useState<KadroTakimBulgusu[]>([]);
  const [hedefTakim, setHedefTakim] = useState<KadroTakimBulgusu | null>(null);
  const [oyuncuArama, setOyuncuArama] = useState("");
  const [oyuncuSonuclari, setOyuncuSonuclari] = useState<KadroOyuncuBulgusu[]>([]);
  const [seciliOyuncu, setSeciliOyuncu] = useState<KadroOyuncuBulgusu | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [formHatasi, setFormHatasi] = useState("");

  // --- lig arama (350 ms bekletici; bayat sonuç ekrana basılmıyor) ---
  useEffect(() => {
    const q = ligAramasi.trim();
    if (q.length < 2) {
      setLigSecenekleri([]);
      return;
    }
    let iptal = false;
    const z = setTimeout(async () => {
      try {
        const r = await apiTeleskorLigAra("FOOTBALL", q);
        if (!iptal) setLigSecenekleri(r.slice(0, 12));
      } catch {
        if (!iptal) setLigSecenekleri([]);
      }
    }, 350);
    return () => {
      iptal = true;
      clearTimeout(z);
    };
  }, [ligAramasi]);

  // --- taşıma: hedef takım araması ---
  useEffect(() => {
    const q = takimArama.trim();
    if (q.length < 2) {
      setTakimSonuclari([]);
      return;
    }
    let iptal = false;
    const z = setTimeout(async () => {
      try {
        const r = await apiKadroTakimAra(q);
        if (!iptal) setTakimSonuclari(r.slice(0, 10));
      } catch {
        if (!iptal) setTakimSonuclari([]);
      }
    }, 350);
    return () => {
      iptal = true;
      clearTimeout(z);
    };
  }, [takimArama]);

  // --- ekleme: oyuncu araması ---
  useEffect(() => {
    const q = oyuncuArama.trim();
    if (q.length < 2) {
      setOyuncuSonuclari([]);
      return;
    }
    let iptal = false;
    const z = setTimeout(async () => {
      try {
        const r = await apiKadroOyuncuAra(q);
        if (!iptal) setOyuncuSonuclari(r.slice(0, 12));
      } catch {
        if (!iptal) setOyuncuSonuclari([]);
      }
    }, 350);
    return () => {
      iptal = true;
      clearTimeout(z);
    };
  }, [oyuncuArama]);

  const takimlariYukle = useCallback(async (ligId: number) => {
    setYukleniyor(true);
    setHata("");
    try {
      setTakimlar(await apiKadroTakimlar(ligId));
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Takım listesi alınamadı.");
      setTakimlar([]);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  const defteriYukle = useCallback(
    async (ligId: number | null, kapali: boolean) => {
      try {
        setDefter(await apiKadroDuzeltmeler(ligId, kapali));
      } catch {
        setDefter([]);
      }
    },
    [],
  );

  useEffect(() => {
    defteriYukle(lig?.id ?? null, defterKapali);
  }, [lig?.id, defterKapali, defteriYukle]);

  async function ligSec(ligId: number, ad: string) {
    setLig({ id: ligId, ad });
    setLigSecenekleri([]);
    setLigAramasi("");
    kapat();
    await takimlariYukle(ligId);
  }

  const kadroyuYukle = useCallback(async (takimId: number) => {
    setKadroYukleniyor(true);
    try {
      setKadro(await apiKadroTakim(takimId));
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Kadro alınamadı.");
      setKadro(null);
    } finally {
      setKadroYukleniyor(false);
    }
  }, []);

  async function takimAc(id: number, ad: string) {
    setAcik({ id, ad });
    // Önce boşaltılıyor: modal anında açılıyor, temizlenmeseydi istek dönene
    // kadar YENİ takımın başlığı altında ESKİ takımın kadrosu görünürdü.
    setKadro(null);
    setFiltre("kadro");
    formuKapat();
    await kadroyuYukle(id);
  }

  function kapat() {
    setAcik(null);
    setKadro(null);
    formuKapat();
  }

  function formuKapat() {
    setForm(null);
    setGerekce("");
    setMevki("");
    setForma("");
    setTakimArama("");
    setTakimSonuclari([]);
    setHedefTakim(null);
    setOyuncuArama("");
    setOyuncuSonuclari([]);
    setSeciliOyuncu(null);
    setFormHatasi("");
  }

  function formAc(f: Form) {
    formuKapat();
    setForm(f);
  }

  // MODAL AÇIKKEN: Esc kapatıyor, arka plan kaydırılmıyor (Veri Düzeltme
  // masasıyla aynı kalıp).
  useEffect(() => {
    if (!acik) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (form) formuKapat();
        else kapat();
      }
    };
    window.addEventListener("keydown", onKey);
    const oncekiOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = oncekiOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, form]);

  async function sonrasi(mesaj: string) {
    setBilgi(mesaj);
    formuKapat();
    if (acik) await kadroyuYukle(acik.id);
    if (lig) await takimlariYukle(lig.id);
    await defteriYukle(lig?.id ?? null, defterKapali);
  }

  async function gonder() {
    if (!form || !acik) return;
    if (!gerekce.trim()) {
      setFormHatasi("Gerekçe zorunlu: bu bilgiyi nereden aldın?");
      return;
    }
    setGonderiliyor(true);
    setFormHatasi("");
    try {
      if (form.tur === "CIKAR") {
        await apiKadroYaz({
          takimId: acik.id,
          oyuncuId: form.aday.oyuncuId,
          islem: "CIKAR",
          gerekce: gerekce.trim(),
        });
        await sonrasi(`${form.aday.ad ?? "Oyuncu"} ${acik.ad} kadrosundan çıkarıldı.`);
      } else if (form.tur === "GERI_EKLE") {
        await apiKadroYaz({
          takimId: acik.id,
          oyuncuId: form.aday.oyuncuId,
          islem: "EKLE",
          gerekce: gerekce.trim(),
        });
        await sonrasi(`${form.aday.ad ?? "Oyuncu"} ${acik.ad} kadrosuna geri eklendi.`);
      } else if (form.tur === "TASI") {
        if (!hedefTakim) {
          setFormHatasi("Hedef takımı seç.");
          return;
        }
        if (hedefTakim.id === acik.id) {
          setFormHatasi("Hedef takım bu takımın kendisi.");
          return;
        }
        await apiKadroYaz(
          {
            takimId: hedefTakim.id,
            oyuncuId: form.aday.oyuncuId,
            islem: "EKLE",
            forma: forma.trim() || null,
            gerekce: gerekce.trim(),
          },
          acik.id,
        );
        await sonrasi(
          `${form.aday.ad ?? "Oyuncu"} ${hedefTakim.ad ?? "hedef takım"} kadrosuna taşındı.`,
        );
      } else {
        if (!seciliOyuncu) {
          setFormHatasi("Eklenecek oyuncuyu seç.");
          return;
        }
        await apiKadroYaz(
          {
            takimId: acik.id,
            oyuncuId: seciliOyuncu.id,
            islem: "EKLE",
            mevki: mevki || null,
            forma: forma.trim() || null,
            gerekce: gerekce.trim(),
          },
          seciliOyuncu.kartTakim?.id,
        );
        await sonrasi(`${seciliOyuncu.ad} ${acik.ad} kadrosuna eklendi.`);
      }
    } catch (e) {
      setFormHatasi(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally {
      setGonderiliyor(false);
    }
  }

  async function geriAl(d: KadroDuzeltme) {
    if (
      !window.confirm(
        `${d.oyuncuAd} için "${d.islem === "CIKAR" ? "çıkar" : "ekle"}" düzeltmesi geri alınsın mı? ` +
          "Kadro yeniden kuralın kararına döner.",
      )
    ) {
      return;
    }
    setHata("");
    try {
      await apiKadroGeriAl(d.id, acik && acik.id !== d.takimId ? acik.id : undefined);
      await sonrasi(`${d.oyuncuAd} için düzeltme geri alındı.`);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Geri alınamadı.");
    }
  }

  async function kapatDene() {
    setHata("");
    try {
      const r = await apiKadroKapatDene();
      await sonrasi(
        r.kapanan > 0
          ? `${r.kapanan} düzeltme gereksizleştiği için kapandı.`
          : "Kapanacak düzeltme yok; hepsi hâlâ gerekli.",
      );
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Çalıştırılamadı.");
    }
  }

  const adaylar = kadro?.adaylar ?? [];
  const kadrodakiler = adaylar.filter((a) => a.kaldi);
  const supheliler = adaylar.filter((a) => a.kaldi && a.supheli);
  const cikanlar = adaylar.filter((a) => !a.kaldi);
  const gorunen =
    filtre === "kadro" ? kadrodakiler : filtre === "supheli" ? supheliler : cikanlar;
  const toplamHicOynamamis = takimlar.reduce((t, x) => t + x.hicOynamamis, 0);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* ---------- Lig seçimi ---------- */}
      <div className="card card-pad">
        <div className="card-title">Kadro Masası</div>
        <p className="muted" style={{ fontSize: 13, margin: "6px 0 16px" }}>
          Takım kadrolarını elle düzeltir: oyuncuyu <b>çıkar</b>, başka takıma{" "}
          <b>taşı</b> ya da katalogdaki bir oyuncuyu <b>ekle</b>. Ayrılan
          oyuncuların çoğunu sistem maç kadrolarından ve transferlerden kendisi
          buluyor; burada kalanlar düzeltilir. Düzeltme uygulamada ve sitede
          hemen görünür; veri kendiliğinden aynı sonuca vardığında kendiliğinden
          kapanır.
        </p>

        <label className="label" htmlFor="kadro-lig-ara">
          Lig seç
        </label>
        <input
          id="kadro-lig-ara"
          className="input"
          placeholder="Lig ara (en az 2 harf) — örn. 3. Lig"
          value={ligAramasi}
          onChange={(e) => setLigAramasi(e.target.value)}
        />

        {ligSecenekleri.length > 0 && (
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {ligSecenekleri.map((l) => (
              <button
                key={l.ligId}
                className="btn btn-sm"
                style={{ justifyContent: "flex-start" }}
                onClick={() => ligSec(l.ligId, l.ad ?? `#${l.ligId}`)}
              >
                {l.ad ?? `#${l.ligId}`}
                {l.ulke ? <span className="muted"> · {l.ulke}</span> : null}
              </button>
            ))}
          </div>
        )}

        {lig && (
          <div
            style={{
              marginTop: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span className="muted" style={{ fontSize: 12.5 }}>
              Seçili lig
            </span>
            <span style={{ fontWeight: 600 }}>{lig.ad}</span>
            <button className="btn btn-sm" onClick={() => takimlariYukle(lig.id)}>
              Yenile
            </button>
          </div>
        )}
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}
      {bilgi && !acik && <div className="alert alert-success">{bilgi}</div>}

      {yukleniyor && (
        <div className="card card-pad muted" style={{ fontSize: 13 }}>
          Kadrolar hesaplanıyor… (büyük liglerde birkaç saniye sürebilir)
        </div>
      )}

      {!yukleniyor && lig && takimlar.length === 0 && !hata && (
        <div className="card card-pad muted" style={{ fontSize: 13 }}>
          Bu ligde takım bulunamadı.
        </div>
      )}

      {/* ---------- Takımlar ---------- */}
      {takimlar.length > 0 && (
        <div className="card card-pad">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div className="card-title">Takımlar</div>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {toplamHicOynamamis > 0 && (
                <>
                  <b style={{ color: "var(--warning)" }}>
                    {toplamHicOynamamis} oyuncu hiç oynamamış
                  </b>
                  {" · "}
                </>
              )}
              {takimlar.length} takım
            </span>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "6px 0 14px" }}>
            <b>Hiç oynamamış</b>: kadroda görünen ama bu takımda hiç maç kadrosuna
            girmemiş liste oyuncusu. Asıl kontrol edilecekler bunlar; liste en
            çok olandan başlar.
          </p>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Takım</th>
                  <th style={{ textAlign: "right" }}>Kadroda</th>
                  <th style={{ textAlign: "right" }}>Listede</th>
                  <th style={{ textAlign: "right" }}>Sistem çıkardı</th>
                  <th style={{ textAlign: "right" }}>Maçtan eklendi</th>
                  <th style={{ textAlign: "right" }}>Hiç oynamamış</th>
                  <th style={{ textAlign: "right" }}>Elle</th>
                  <th style={{ width: 96 }} />
                </tr>
              </thead>
              <tbody>
                {takimlar.map((t) => (
                  <tr key={t.takimId}>
                    <td>
                      <div className="cell-title" style={{ maxWidth: 240 }}>
                        {t.ad}
                      </div>
                      {!t.gorunur && (
                        <div className="cell-sub" style={{ color: "var(--danger)" }}>
                          kadro sekmesi boş görünüyor
                        </div>
                      )}
                    </td>
                    <Sayi deger={t.kalan} notr />
                    <Sayi deger={t.listede} notr />
                    <Sayi deger={t.otomatikCikan} notr />
                    <Sayi deger={t.mactanEklenen} notr />
                    <Sayi deger={t.hicOynamamis} uyari />
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {t.elleEklenen + t.elleCikarilan === 0 ? (
                        <span className="muted">0</span>
                      ) : (
                        <span>
                          +{t.elleEklenen} / −{t.elleCikarilan}
                        </span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-sm" onClick={() => takimAc(t.takimId, t.ad)}>
                        Kadroyu aç
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------- Düzeltme defteri ---------- */}
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
          <div className="card-title">
            Düzeltme defteri{lig ? ` · ${lig.ad}` : " · bütün ligler"}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className={`btn btn-sm ${!defterKapali ? "btn-primary" : ""}`}
              onClick={() => setDefterKapali(false)}
            >
              Açık olanlar
            </button>
            <button
              className={`btn btn-sm ${defterKapali ? "btn-primary" : ""}`}
              onClick={() => setDefterKapali(true)}
            >
              Son kapananlar
            </button>
            <button className="btn btn-sm" onClick={kapatDene}>
              Gereksizleşenleri şimdi kapat
            </button>
          </div>
        </div>
        {defter.length === 0 ? (
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
            {defterKapali ? "Son 90 günde kapanan düzeltme yok." : "Açık düzeltme yok."}
          </p>
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Oyuncu</th>
                  <th>Takım</th>
                  <th>İşlem</th>
                  <th>Gerekçe</th>
                  <th>Tarih</th>
                  <th style={{ width: 110 }} />
                </tr>
              </thead>
              <tbody>
                {defter.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="cell-title">{d.oyuncuAd}</div>
                      <div className="cell-sub">#{d.oyuncuId}</div>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => takimAc(d.takimId, d.takimAd)}
                      >
                        {d.takimAd}
                      </button>
                    </td>
                    <td>
                      <IslemRozeti islem={d.islem} />
                    </td>
                    <td style={{ maxWidth: 320 }}>{d.gerekce}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {tarih(d.olusturuldu)}
                      {d.kapandi && (
                        <div className="cell-sub">
                          {tarih(d.kapandi)} ·{" "}
                          {KAPANMA_ADI[d.kapanmaNedeni ?? ""] ?? d.kapanmaNedeni}
                        </div>
                      )}
                    </td>
                    <td>
                      {!d.kapandi && (
                        <button className="btn btn-sm" onClick={() => geriAl(d)}>
                          Geri al
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

      {/* ---------- Takım kadrosu: MODAL ---------- */}
      {acik && (
        <div className="modal-overlay" onClick={kapat}>
          <div
            className="modal"
            style={{ maxWidth: 1180 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="card-title" style={{ margin: 0 }}>
                {acik.ad}{" "}
                <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>
                  #{acik.id}
                  {kadro ? ` · son 120 günde ${kadro.macSayisi} maç kadrosu` : ""}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => formAc({ tur: "EKLE" })}>
                  Oyuncu ekle
                </button>
                <button className="btn btn-ghost btn-sm" onClick={kapat}>
                  Kapat
                </button>
              </div>
            </div>

            <div className="card-pad">
              {bilgi && <div className="alert alert-success" style={{ marginBottom: 12 }}>{bilgi}</div>}

              {form && (
                <IslemFormu
                  form={form}
                  takimAd={acik.ad}
                  gerekce={gerekce}
                  setGerekce={setGerekce}
                  mevki={mevki}
                  setMevki={setMevki}
                  forma={forma}
                  setForma={setForma}
                  takimArama={takimArama}
                  setTakimArama={setTakimArama}
                  takimSonuclari={takimSonuclari}
                  hedefTakim={hedefTakim}
                  setHedefTakim={setHedefTakim}
                  oyuncuArama={oyuncuArama}
                  setOyuncuArama={setOyuncuArama}
                  oyuncuSonuclari={oyuncuSonuclari}
                  seciliOyuncu={seciliOyuncu}
                  setSeciliOyuncu={setSeciliOyuncu}
                  hata={formHatasi}
                  gonderiliyor={gonderiliyor}
                  gonder={gonder}
                  vazgec={formuKapat}
                />
              )}

              <div className="tabs" style={{ marginBottom: 12 }}>
                <button
                  className={`tab ${filtre === "kadro" ? "active" : ""}`}
                  onClick={() => setFiltre("kadro")}
                >
                  Kadroda ({kadrodakiler.length})
                </button>
                <button
                  className={`tab ${filtre === "supheli" ? "active" : ""}`}
                  onClick={() => setFiltre("supheli")}
                >
                  Hiç oynamamış ({supheliler.length})
                </button>
                <button
                  className={`tab ${filtre === "cikan" ? "active" : ""}`}
                  onClick={() => setFiltre("cikan")}
                >
                  Çıkarılanlar ({cikanlar.length})
                </button>
              </div>

              {kadroYukleniyor && (
                <div className="muted" style={{ fontSize: 13 }}>
                  Yükleniyor…
                </div>
              )}

              {!kadroYukleniyor && kadro && gorunen.length === 0 && (
                <div className="muted" style={{ fontSize: 13 }}>
                  Bu sekmede oyuncu yok.
                </div>
              )}

              {!kadroYukleniyor && gorunen.length > 0 && (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Oyuncu</th>
                        <th>Kaynak</th>
                        <th>Bu takımda son maç</th>
                        <th>Başka kulüpte son maç</th>
                        <th>Son transfer</th>
                        <th>Durum</th>
                        <th style={{ width: 150 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {gorunen.map((a) => (
                        <AdaySatiri
                          key={a.oyuncuId}
                          aday={a}
                          formAc={formAc}
                          geriAl={geriAl}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {kadro && kadro.digerDuzeltmeler.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="card-title" style={{ fontSize: 14 }}>
                    Diğer açık düzeltmeler
                  </div>
                  <p className="muted" style={{ fontSize: 12, margin: "4px 0 8px" }}>
                    Bu oyuncular artık bu takımın adayı değil (listeden de düşmüş,
                    burada da oynamıyor); düzeltme bir sonraki kontrolde kendiliğinden
                    kapanır.
                  </p>
                  {kadro.digerDuzeltmeler.map((d) => (
                    <div
                      key={d.id}
                      style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}
                    >
                      <IslemRozeti islem={d.islem} />
                      <span>{d.oyuncuAd}</span>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {d.gerekce}
                      </span>
                      <button className="btn btn-sm" onClick={() => geriAl(d)}>
                        Geri al
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdaySatiri({
  aday: a,
  formAc,
  geriAl,
}: {
  aday: KadroAdayi;
  formAc: (f: Form) => void;
  geriAl: (d: KadroDuzeltme) => void;
}) {
  return (
    <tr>
      <td>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {a.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={a.foto}
              alt=""
              width={32}
              height={32}
              style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--neutral-soft)",
                flexShrink: 0,
              }}
            />
          )}
          <div>
            <div className="cell-title" style={{ maxWidth: 220 }}>
              {a.ad ?? "(adı henüz yok)"}
            </div>
            <div className="cell-sub">
              #{a.oyuncuId}
              {a.mevki ? ` · ${a.mevki}` : ""}
              {a.forma ? ` · ${a.forma} numara` : ""}
              {a.kartTakim?.ad ? ` · kaydı: ${a.kartTakim.ad}` : ""}
            </div>
          </div>
        </div>
      </td>
      <td>
        <span
          className={`badge ${a.geldigi === "ELLE" ? "badge-lang" : "badge-draft"}`}
          style={{ whiteSpace: "nowrap" }}
        >
          {KAYNAK_ADI[a.geldigi]}
        </span>
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        {a.buradaSon ? tarih(a.buradaSon) : <span style={{ color: "var(--warning)" }}>hiç oynamadı</span>}
      </td>
      <td>
        {a.baskaSon ? (
          <>
            {tarih(a.baskaSon)}
            <div className="cell-sub">{a.baskaTakim?.ad}</div>
          </>
        ) : (
          <span className="muted">—</span>
        )}
      </td>
      <td>
        {a.transferTarihi ? (
          <>
            {tarih(a.transferTarihi)}
            <div className="cell-sub">
              {a.transferBuraya ? "bu takıma" : `→ ${a.transferHedef ?? "?"}`}
            </div>
          </>
        ) : (
          <span className="muted">—</span>
        )}
      </td>
      <td style={{ maxWidth: 260 }}>
        {a.duzeltme ? (
          <>
            <IslemRozeti islem={a.duzeltme.islem} />
            <div className="cell-sub" title={a.duzeltme.gerekce}>
              {a.duzeltme.gerekce}
            </div>
          </>
        ) : a.kaldi ? (
          <span
            className={`badge ${a.supheli ? "badge-scheduled" : "badge-published"}`}
            style={{ whiteSpace: "nowrap" }}
          >
            {a.supheli ? "Kadroda, hiç oynamamış" : "Kadroda"}
          </span>
        ) : (
          <div style={{ fontSize: 12.5 }}>
            {(a.nedenler ?? []).map((n) => (
              <div key={n}>{n}</div>
            ))}
          </div>
        )}
      </td>
      <td>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {a.duzeltme ? (
            <button className="btn btn-sm" onClick={() => geriAl(a.duzeltme!)}>
              Geri al
            </button>
          ) : a.kaldi ? (
            <>
              <button className="btn btn-sm" onClick={() => formAc({ tur: "CIKAR", aday: a })}>
                Çıkar
              </button>
              <button className="btn btn-sm" onClick={() => formAc({ tur: "TASI", aday: a })}>
                Taşı
              </button>
            </>
          ) : (
            <button className="btn btn-sm" onClick={() => formAc({ tur: "GERI_EKLE", aday: a })}>
              Geri ekle
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function IslemFormu(p: {
  form: Form;
  takimAd: string;
  gerekce: string;
  setGerekce: (s: string) => void;
  mevki: string;
  setMevki: (s: string) => void;
  forma: string;
  setForma: (s: string) => void;
  takimArama: string;
  setTakimArama: (s: string) => void;
  takimSonuclari: KadroTakimBulgusu[];
  hedefTakim: KadroTakimBulgusu | null;
  setHedefTakim: (t: KadroTakimBulgusu | null) => void;
  oyuncuArama: string;
  setOyuncuArama: (s: string) => void;
  oyuncuSonuclari: KadroOyuncuBulgusu[];
  seciliOyuncu: KadroOyuncuBulgusu | null;
  setSeciliOyuncu: (o: KadroOyuncuBulgusu | null) => void;
  hata: string;
  gonderiliyor: boolean;
  gonder: () => void;
  vazgec: () => void;
}) {
  const { form } = p;
  const baslik =
    form.tur === "CIKAR"
      ? `${form.aday.ad ?? "Oyuncu"} — ${p.takimAd} kadrosundan çıkar`
      : form.tur === "GERI_EKLE"
        ? `${form.aday.ad ?? "Oyuncu"} — ${p.takimAd} kadrosuna geri ekle`
        : form.tur === "TASI"
          ? `${form.aday.ad ?? "Oyuncu"} — başka takıma taşı`
          : `${p.takimAd} kadrosuna oyuncu ekle`;
  const aciklama =
    form.tur === "CIKAR"
      ? "Oyuncu bu takımın kadrosunda görünmez. Sağlayıcı da onu listeden düşürünce düzeltme kendiliğinden kapanır."
      : form.tur === "GERI_EKLE"
        ? "Sistem bu oyuncuyu çıkarmıştı; düzeltme sistemin kararını ezer ve oyuncu kadroda görünür."
        : form.tur === "TASI"
          ? "Oyuncu hedef takımın kadrosunda görünür, başka hiçbir takımın kadrosunda görünmez. Oyuncu sayfasındaki takım da değişir."
          : "Katalogda var olan bir oyuncuyu bu takıma ekler. Oyuncu başka takımların kadrosunda artık görünmez.";

  return (
    <div
      className="card card-pad"
      style={{ marginBottom: 16, border: "1px solid var(--border)" }}
    >
      <div className="card-title" style={{ fontSize: 15 }}>
        {baslik}
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: "4px 0 12px" }}>
        {aciklama}
      </p>

      {form.tur === "EKLE" && (
        <div style={{ marginBottom: 12 }}>
          <label className="label" htmlFor="kadro-oyuncu-ara">
            Oyuncu
          </label>
          {p.seciliOyuncu ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <b>{p.seciliOyuncu.ad}</b>
              <span className="muted">#{p.seciliOyuncu.id}</span>
              {p.seciliOyuncu.kartTakim?.ad && (
                <span className="muted">kaydı: {p.seciliOyuncu.kartTakim.ad}</span>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => p.setSeciliOyuncu(null)}>
                Değiştir
              </button>
              {p.seciliOyuncu.masaTakim?.ad && (
                <div className="alert alert-error" style={{ width: "100%", marginTop: 6 }}>
                  Bu oyuncu zaten elle <b>{p.seciliOyuncu.masaTakim.ad}</b> kadrosuna
                  eklenmiş. Devam edersen oradaki ekleme kapanır.
                </div>
              )}
            </div>
          ) : (
            <>
              <input
                id="kadro-oyuncu-ara"
                className="input"
                placeholder="Oyuncu adı ya da kimliği (en az 2 karakter)"
                value={p.oyuncuArama}
                onChange={(e) => p.setOyuncuArama(e.target.value)}
                autoFocus
              />
              {p.oyuncuSonuclari.length > 0 && (
                <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                  {p.oyuncuSonuclari.map((o) => (
                    <button
                      key={o.id}
                      className="btn btn-sm"
                      style={{ justifyContent: "flex-start" }}
                      onClick={() => p.setSeciliOyuncu(o)}
                    >
                      {o.ad}
                      <span className="muted">
                        {" "}
                        · #{o.id}
                        {o.dogum ? ` · ${o.dogum.slice(0, 4)}` : ""}
                        {o.kartTakim?.ad ? ` · ${o.kartTakim.ad}` : " · takımsız"}
                        {o.masaTakim?.ad ? ` · elle: ${o.masaTakim.ad}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {form.tur === "TASI" && (
        <div style={{ marginBottom: 12 }}>
          <label className="label" htmlFor="kadro-takim-ara">
            Hedef takım
          </label>
          {p.hedefTakim ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <b>{p.hedefTakim.ad}</b>
              {p.hedefTakim.ulke && <span className="muted">{p.hedefTakim.ulke}</span>}
              <button className="btn btn-ghost btn-sm" onClick={() => p.setHedefTakim(null)}>
                Değiştir
              </button>
            </div>
          ) : (
            <>
              <input
                id="kadro-takim-ara"
                className="input"
                placeholder="Takım ara (en az 2 harf)"
                value={p.takimArama}
                onChange={(e) => p.setTakimArama(e.target.value)}
                autoFocus
              />
              {p.takimSonuclari.length > 0 && (
                <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                  {p.takimSonuclari.map((t) => (
                    <button
                      key={t.id}
                      className="btn btn-sm"
                      style={{ justifyContent: "flex-start" }}
                      onClick={() => p.setHedefTakim(t)}
                    >
                      {t.ad ?? t.adEn ?? `#${t.id}`}
                      {t.ulke ? <span className="muted"> · {t.ulke}</span> : null}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {(form.tur === "EKLE" || form.tur === "TASI") && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          {form.tur === "EKLE" && (
            <div style={{ minWidth: 200 }}>
              <label className="label" htmlFor="kadro-mevki">
                Mevki
              </label>
              <select
                id="kadro-mevki"
                className="select"
                value={p.mevki}
                onChange={(e) => p.setMevki(e.target.value)}
              >
                {MEVKILER.map((m) => (
                  <option key={m.kod} value={m.kod}>
                    {m.ad}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ width: 140 }}>
            <label className="label" htmlFor="kadro-forma">
              Forma numarası
            </label>
            <input
              id="kadro-forma"
              className="input"
              placeholder="boş bırakılabilir"
              maxLength={10}
              value={p.forma}
              onChange={(e) => p.setForma(e.target.value)}
            />
          </div>
        </div>
      )}

      <label className="label" htmlFor="kadro-gerekce">
        Gerekçe <span className="req">*</span>
      </label>
      <input
        id="kadro-gerekce"
        className="input"
        placeholder="Bu bilgiyi nereden aldın? örn. kulübün resmi açıklaması, TFF kadro listesi"
        maxLength={300}
        value={p.gerekce}
        onChange={(e) => p.setGerekce(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") p.gonder();
        }}
      />

      {p.hata && (
        <div className="alert alert-error" style={{ marginTop: 10 }}>
          {p.hata}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          className={`btn ${form.tur === "CIKAR" ? "btn-danger" : "btn-primary"}`}
          onClick={p.gonder}
          disabled={p.gonderiliyor}
        >
          {p.gonderiliyor
            ? "Kaydediliyor…"
            : form.tur === "CIKAR"
              ? "Kadrodan çıkar"
              : form.tur === "TASI"
                ? "Taşı"
                : form.tur === "GERI_EKLE"
                  ? "Geri ekle"
                  : "Kadroya ekle"}
        </button>
        <button className="btn btn-ghost" onClick={p.vazgec} disabled={p.gonderiliyor}>
          Vazgeç
        </button>
      </div>
    </div>
  );
}

function IslemRozeti({ islem }: { islem: "CIKAR" | "EKLE" }) {
  return (
    <span
      className={`badge ${islem === "CIKAR" ? "badge-flag" : "badge-lang"}`}
      style={{ whiteSpace: "nowrap" }}
    >
      {islem === "CIKAR" ? "Elle çıkarıldı" : "Elle eklendi"}
    </span>
  );
}

function Sayi({ deger, notr, uyari }: { deger: number; notr?: boolean; uyari?: boolean }) {
  return (
    <td style={{ textAlign: "right" }}>
      {deger === 0 ? (
        <span className="muted">0</span>
      ) : (
        <b
          style={{
            color: notr ? undefined : uyari ? "var(--warning)" : "var(--danger)",
          }}
        >
          {deger}
        </b>
      )}
    </td>
  );
}
