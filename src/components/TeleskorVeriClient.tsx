"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiVeriAlanlar,
  apiVeriEksik,
  apiVeriKayit,
  apiVeriOyuncular,
  apiVeriStadyumlar,
  apiVeriYaz,
  apiTeleskorLigAra,
  ApiError,
} from "@/lib/api-client";
import type {
  TakimEksigi,
  VeriAlanDurumu,
  VeriKaydi,
  VeriOyuncusu,
  VeriStadyumu,
} from "@/lib/types";

/**
 * VERİ DÜZELTME MASASI — alan yamaları (motor V96).
 *
 * <h3>Neden gerekli</h3>
 * Sağlayıcı alt liglerde eksik veri gönderiyor: stadyumun kapasitesi ve şehri
 * boş, oyuncunun mevkisi/doğum tarihi/boyu yok. Serhat (11 Eylül 2026):
 * <i>"Bazı oyuncuların içinde hiç veri yok. Bunları tek tek kendimiz doldurmak
 * istiyoruz."</i>
 *
 * <h3>Yama SENKRONLA EZİLMİYOR</h3>
 * Yazılan değer motorun {@code veri_duzeltme} tablosuna gidiyor; ana tablodaki
 * alanı bir veritabanı tetikleyicisi basıyor ve senkronun üstüne yazmasını
 * engelliyor. Panel ana tabloya HİÇ yazmıyor.
 *
 * <h3>Ekranın kurgusu: "listeyi bitirmek"</h3>
 * Asıl zorluk yazmak değil, NEYİ yazacağını bulmak — 2. Lig ≈ 36 takım ×
 * ~25 oyuncu. Bu yüzden merkezde eksik raporu var ve her şey en eksik olandan
 * sıralı: liste yukarıdan aşağı doldurulduğunda en çok iş gören kayıtlar önce
 * bitiyor.
 *
 * <h3>ADLAR BURADA DEĞİL</h3>
 * Takım/oyuncu/stadyum ADI Çeviri Düzeltme sayfasında ({@code
 * translation_override}). Aynı kavramın iki masada iki doğrusu olmasın diye
 * motorun beyaz listesi {@code name_tr} taşımıyor.
 */

type Durum = "" | "kaydediliyor" | "ok" | "hata";

export default function TeleskorVeriClient() {
  const [ligAramasi, setLigAramasi] = useState("");
  const [ligSecenekleri, setLigSecenekleri] = useState<
    { ligId: number; ad?: string | null; ulke?: string | null }[]
  >([]);
  const [lig, setLig] = useState<{ id: number; ad: string } | null>(null);

  const [eksikler, setEksikler] = useState<TakimEksigi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");

  // Açık düzenleme: hangi takımın paneli açık, içinde hangi sekme.
  const [acikTakim, setAcikTakim] = useState<TakimEksigi | null>(null);
  const [oyuncular, setOyuncular] = useState<VeriOyuncusu[]>([]);
  const [kayit, setKayit] = useState<VeriKaydi | null>(null);

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

  const raporuYukle = useCallback(async (ligId: number) => {
    setYukleniyor(true);
    setHata("");
    try {
      setEksikler(await apiVeriEksik(ligId));
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Eksik raporu alınamadı.");
      setEksikler([]);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  async function ligSec(ligId: number, ad: string) {
    setLig({ id: ligId, ad });
    setLigSecenekleri([]);
    setLigAramasi("");
    kapat();
    await raporuYukle(ligId);
  }

  const kayitRef = useRef<HTMLDivElement | null>(null);

  function kapat() {
    setAcikTakim(null);
    setKayit(null);
    setOyuncular([]);
  }

  // MODAL AÇIKKEN: Esc kapatıyor, arka plan KAYDIRILMIYOR.
  //
  // İkincisi görsel bir ayrıntı değil: kilit olmasaydı modalın içindeki
  // oyuncu listesinin sonuna gelince tekerlek arkadaki eksik raporunu
  // kaydırmaya başlardı ve modal kapanınca rapor bambaşka bir yerde olurdu.
  useEffect(() => {
    if (!acikTakim) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acikTakim]);

  // Alan düzenleyici modalın İÇİNDE, oyuncu listesinin altında açılıyor;
  // 25 kişilik bir kadroda o da "aşağıda" kalıyor. Açılan kayıt görünür
  // alana getiriliyor.
  //
  // Ölçüt kaydın KİMLİĞİ, nesnenin kendisi DEĞİL: her kaydetmeden sonra
  // `kayit` yeniden okunuyor ve nesne değişiyor — nesneye bağlansaydı her
  // kaydetmede ekran zıplardı.
  useEffect(() => {
    if (!kayit) return;
    kayitRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kayit?.tur, kayit?.id]);

  async function takimAc(t: TakimEksigi) {
    setAcikTakim(t);
    setKayit(null);
    // Liste ÖNCE boşaltılıyor. Modal anında açıldığı için, temizlenmeseydi
    // istek dönene kadar YENİ takımın başlığı altında ESKİ takımın kadrosu
    // görünürdü — sayfa altında açılırken göze çarpmayan bir kusur.
    setOyuncular([]);
    try {
      setOyuncular(await apiVeriOyuncular(t.takimId));
    } catch {
      setOyuncular([]);
    }
  }

  async function kayitAc(tur: string, id: number) {
    setKayit(null);
    try {
      setKayit(await apiVeriKayit(tur, id));
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Kayıt alınamadı.");
    }
  }


  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* ---------- Lig seçimi ---------- */}
      <div className="card card-pad">
        <div className="card-title">Veri Düzeltme Masası</div>
        <p className="muted" style={{ fontSize: 13, margin: "6px 0 16px" }}>
          Sağlayıcının eksik ya da yanlış gönderdiği alanları elle doldurur.
          Yazdığın değer <b>senkronla ezilmez</b>. Takım/oyuncu/stadyum{" "}
          <b>adları</b> için Çeviri Düzeltme sayfasını kullan.
        </p>

        <label className="label" htmlFor="veri-lig-ara">
          Lig seç
        </label>
        <input
          id="veri-lig-ara"
          className="input"
          placeholder="Lig ara (en az 2 harf) — örn. 2. Lig"
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
            <button className="btn btn-sm" onClick={() => raporuYukle(lig.id)}>
              Yenile
            </button>
          </div>
        )}
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      {yukleniyor && (
        <div className="card card-pad muted" style={{ fontSize: 13 }}>
          Yükleniyor…
        </div>
      )}

      {!yukleniyor && lig && eksikler.length === 0 && !hata && (
        <div className="card card-pad muted" style={{ fontSize: 13 }}>
          Bu ligde takım bulunamadı. (Kupa ve alt gruplarda takımlar fikstürden
          türetiliyor; fikstür henüz çekilmemiş olabilir.)
        </div>
      )}

      {/* ---------- Eksik raporu ---------- */}
      {eksikler.length > 0 && (
        <div className="card card-pad">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div className="card-title">Eksik raporu</div>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {eksikler.length} takım
            </span>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "6px 0 14px" }}>
            Kırmızı sayılar eksik kayıt adedidir; liste en eksik takımdan
            başlar.
          </p>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Takım</th>
                  <th>Stadyum</th>
                  <th style={{ textAlign: "right" }}>Oyuncu</th>
                  <th style={{ textAlign: "right" }}>Mevki yok</th>
                  <th style={{ textAlign: "right" }}>Doğum yok</th>
                  <th style={{ textAlign: "right" }}>Boy yok</th>
                  <th style={{ textAlign: "right" }}>Boş kayıt</th>
                  <th style={{ width: 96 }} />
                </tr>
              </thead>
              <tbody>
                {eksikler.map((t) => (
                  <tr key={t.takimId}>
                    <td>
                      <div className="cell-title" style={{ maxWidth: 240 }}>
                        {t.takim}
                      </div>
                    </td>
                    <td>
                      {t.stadyum ? (
                        <div style={{ maxWidth: 260 }}>{t.stadyum}</div>
                      ) : (
                        <Eksik>stadyum bağlı değil</Eksik>
                      )}
                      {t.stadyum && (!t.kapasiteVar || !t.sehirVar) && (
                        <div className="cell-sub">
                          {!t.kapasiteVar && <Eksik>kapasite yok</Eksik>}
                          {!t.kapasiteVar && !t.sehirVar && " · "}
                          {!t.sehirVar && <Eksik>şehir yok</Eksik>}
                        </div>
                      )}
                    </td>
                    <Sayi deger={t.oyuncu} notr />
                    <Sayi deger={t.mevkiEksik} />
                    <Sayi deger={t.dogumEksik} />
                    <Sayi deger={t.boyEksik} />
                    <Sayi deger={t.bosOyuncu} />
                    <td>
                      <button className="btn btn-sm" onClick={() => takimAc(t)}>
                        Düzenle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------- Seçili takım: MODAL ----------
          Eskiden sayfanın ALTINA açılıyordu ve uzun eksik raporlarında
          kullanıcı onu görmek için kaydırmak zorunda kalıyordu (Serhat:
          "en altta geliyor zor oluyor"). Aynı sorun üye sayfasında bir kez
          çözülmüş; kalıp oradan alındı — zemine tıklamak ve Esc kapatıyor. */}
      {acikTakim && (
        <div className="modal-overlay" onClick={kapat}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="card-title" style={{ margin: 0 }}>
                {acikTakim.takim}{" "}
                <span
                  className="muted"
                  style={{ fontWeight: 400, fontSize: 13 }}
                >
                  #{acikTakim.takimId}
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={kapat}>
                Kapat
              </button>
            </div>

            <div className="card-pad">
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <button
                  className="btn btn-sm"
                  onClick={() => kayitAc("TEAM", acikTakim.takimId)}
                >
                  Takım bilgileri
                </button>
                {acikTakim.venueId ? (
                  <button
                    className="btn btn-sm"
                    onClick={() => kayitAc("VENUE", acikTakim.venueId!)}
                  >
                    Stadyum bilgileri
                  </button>
                ) : (
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    Stadyum bağlı değil — önce &quot;Takım bilgileri&quot;
                    içinden stadyum seç.
                  </span>
                )}
              </div>

              {oyuncular.length > 0 && (
                <div className="table-wrap" style={{ marginBottom: 14 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Oyuncu</th>
                        <th>Mevki</th>
                        <th>Doğum</th>
                        <th>Boy</th>
                        <th style={{ textAlign: "right" }}>Eksik</th>
                        <th style={{ width: 96 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {oyuncular.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <div
                              className="cell-title"
                              style={{ maxWidth: 260 }}
                            >
                              {o.ad}
                              {o.yamali && (
                                <span
                                  className="badge badge-lang"
                                  style={{ marginLeft: 8 }}
                                  title="Bu kayıtta elle yama var — senkron dokunamıyor"
                                >
                                  yamalı
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{o.mevki ?? <Eksik>—</Eksik>}</td>
                          <td>{o.dogum ?? <Eksik>—</Eksik>}</td>
                          <td>{o.boy ?? <Eksik>—</Eksik>}</td>
                          <Sayi deger={o.eksik} />
                          <td>
                            <button
                              className="btn btn-sm"
                              onClick={() => kayitAc("PLAYER", o.id)}
                            >
                              Düzenle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {kayit && (
                <div ref={kayitRef}>
                  <KayitDuzenle
                    kayit={kayit}
                    onDegisti={async () => {
                      setKayit(await apiVeriKayit(kayit.tur, kayit.id));
                      if (acikTakim) {
                        setOyuncular(await apiVeriOyuncular(acikTakim.takimId));
                        if (lig) await raporuYukle(lig.id);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Eksik/uyarı vurgusu. Renk SABİT HEX DEĞİL: panelde koyu tema var. */
function Eksik({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: "var(--danger)", fontWeight: 600 }}>{children}</span>
  );
}

/**
 * Sağa yaslı sayı hücresi.
 *
 * {@code tabular-nums} olmadan rakamlar farklı genişlikte çiziliyor ve alt
 * alta gelen sayılar hizalanmıyor — 18 takımlık bir sütunda göz taramayı
 * bırakıyor. {@code notr} sayının bir EKSİK değil bir toplam olduğunu
 * söylüyor (kadro mevcudu): orada sıfır da, büyük sayı da olağan.
 */
function Sayi({ deger, notr = false }: { deger: number; notr?: boolean }) {
  const eksik = !notr && deger > 0;
  return (
    <td
      className={!notr && deger === 0 ? "muted" : undefined}
      style={{
        textAlign: "right",
        fontVariantNumeric: "tabular-nums",
        ...(eksik ? { color: "var(--danger)", fontWeight: 600 } : null),
      }}
    >
      {deger}
    </td>
  );
}

/** Tek kaydın alanları: değer + gerekçe yazılıp kaydediliyor. */
function KayitDuzenle({
  kayit,
  onDegisti,
}: {
  kayit: VeriKaydi;
  onDegisti: () => Promise<void>;
}) {
  // Eski motor sürümünde alan hiç gelmiyor; boş liste "paylaşım yok" DEĞİL
  // "bilinmiyor" demek ve o durumda uyarı da çıkmıyor — yanlış bir güvence
  // vermektense susmak doğru.
  const paylasan = kayit.paylasanTakimlar ?? [];

  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
      <div className="card-title" style={{ fontSize: 14, marginBottom: 12 }}>
        {kayit.ad}{" "}
        <span className="muted" style={{ fontWeight: 400 }}>
          ({kayit.tur} #{kayit.id})
        </span>
      </div>
      {/* STADYUM PAYLAŞIMI UYARISI — hata değil, BİLGİ.
          Stadyum paylaşmak olağan: aynı kulübün kadın/genç takımları, tek
          millî stadı olan küçük ülkeler, aynı sahayı kullanan kulüpler.
          Panel bunu söylemeyince kullanıcı bir takımın stadını düzeltiyor,
          ötekinin de değiştiğini görüyor ve sistemi bozuk sanıyor. */}
      {paylasan.length > 1 && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "var(--warning-soft)",
            color: "var(--warning)",
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          <b>Bu stadyumu {paylasan.length} takım kullanıyor.</b> Burada
          yaptığın değişiklik hepsinde birden görünür:{" "}
          {paylasan.join(", ")}
          {kayit.paylasanTakimlar!.length === 25 ? " …" : ""}
          <div style={{ marginTop: 4, opacity: 0.85 }}>
            Yanlışsa çare bu alanları değiştirmek değil: ilgili takımın
            &quot;Takım bilgileri&quot; içinden <b>Stadyum</b> alanını doğru
            stadyuma yöneltmek.
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {kayit.alanlar.map((a) => (
          <AlanSatiri
            key={a.alan}
            tur={kayit.tur}
            id={kayit.id}
            alan={a}
            onDegisti={onDegisti}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * STADYUM SEÇİCİ — `referans` alanların çıplak sayı kutusunu bitiren bileşen.
 *
 * <h3>Neden var</h3>
 * `TEAM.venue_id` motorun beyaz listesinde V96'dan beri yamalanabilir
 * duruyordu, ama panel onu "kimlik (sayı)" yazan bir metin kutusu olarak
 * çiziyordu: doğru stadyumu yazmak için kimliğini EZBERE bilmek gerekiyordu.
 * Yani teknik olarak açık, pratikte kullanılamaz bir alandı.
 *
 * <h3>Takım sayısı SEÇMEDEN ÖNCE görünüyor</h3>
 * Stadyum paylaşmak olağan (aynı kulübün genç/kadın takımları, tek millî
 * stadı olan ülkeler, aynı şehirde aynı sahayı kullanan kulüpler). Serhat'ta
 * yaşanan karışıklık ("Bodrumspor'un stadını düzelttim, Muğlaspor'unki de
 * değişti") bunu görmemekten doğuyordu. Sayı seçim anında gösteriliyor —
 * sonradan uyarmak, kararı verdikten sonra uyarmak demek.
 *
 * <h3>Yalnız VENUE</h3>
 * `PLAYER.team_id` de bir `referans` alan ama seçicisi henüz yok; orada eski
 * sayı kutusu duruyor. Bilerek: takım seçicisi ayrı bir uç ister ve bu tur
 * takım sayfasını hedefliyor.
 */
function StadyumSecici({
  deger,
  onSec,
  onYazmayaBasla,
}: {
  deger: string;
  onSec: (id: string) => void;
  onYazmayaBasla: () => void;
}) {
  const [secili, setSecili] = useState<VeriStadyumu | null>(null);
  const [cozuluyor, setCozuluyor] = useState(false);
  const [acik, setAcik] = useState(false);
  const [q, setQ] = useState("");
  const [sonuc, setSonuc] = useState<VeriStadyumu[]>([]);
  const [araniyor, setAraniyor] = useState(false);
  const [hata, setHata] = useState("");
  // Uçuştaki aramanın hangi metne ait olduğu. Kutu değiştiyse gelen sonuç
  // BAYAT sayılıyor ve ekrana basılmıyor — onboarding aramasında ödenen ders.
  const sonAramaRef = useRef("");

  // Mevcut değerin adını çöz. `secili` bağımlılığa KONMUYOR: konsaydı her
  // çözümden sonra effect yeniden koşar ve sonsuz istek üretirdi.
  useEffect(() => {
    const n = Number(deger);
    if (!deger.trim() || !Number.isInteger(n) || n <= 0) {
      setSecili(null);
      return;
    }
    let iptal = false;
    setCozuluyor(true);
    apiVeriStadyumlar({ ids: [n] })
      .then((liste) => {
        if (!iptal) setSecili(liste[0] ?? null);
      })
      .catch(() => {
        // Çözülemedi — ekranda ham kimlik kalıyor. Uydurma bir ad basmak,
        // kimlik göstermekten kötü olurdu.
        if (!iptal) setSecili(null);
      })
      .finally(() => {
        if (!iptal) setCozuluyor(false);
      });
    return () => {
      iptal = true;
    };
  }, [deger]);

  // Arama: 350 ms bekletici. Her tuşta istek atmak motora gereksiz yük,
  // beklemeden aramak da yazarken ekranı zıplatır.
  useEffect(() => {
    if (!acik) return;
    const ara = q.trim();
    sonAramaRef.current = ara;
    if (ara.length < 2) {
      setSonuc([]);
      setAraniyor(false);
      return;
    }
    setAraniyor(true);
    const zaman = setTimeout(() => {
      apiVeriStadyumlar({ q: ara })
        .then((liste) => {
          if (sonAramaRef.current !== ara) return;
          setSonuc(liste);
          setHata("");
        })
        .catch((e) => {
          if (sonAramaRef.current !== ara) return;
          setHata(e instanceof ApiError ? e.message : "Arama başarısız.");
        })
        .finally(() => {
          if (sonAramaRef.current === ara) setAraniyor(false);
        });
    }, 350);
    return () => clearTimeout(zaman);
  }, [q, acik]);

  function sec(s: VeriStadyumu) {
    onSec(String(s.id));
    setSecili(s);
    setAcik(false);
    setQ("");
    setSonuc([]);
    onYazmayaBasla();
  }

  if (!acik) {
    return (
      <div style={{ display: "grid", gap: 4 }}>
        <div
          className="input"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            cursor: "pointer",
            minHeight: 36,
          }}
          onClick={() => setAcik(true)}
        >
          <span style={{ minWidth: 0 }}>
            {secili ? (
              <>
                <span className="cell-title">{secili.ad}</span>
                <span className="cell-sub">{stadyumAltYazi(secili)}</span>
              </>
            ) : cozuluyor ? (
              <span className="muted">çözülüyor…</span>
            ) : deger.trim() ? (
              <span className="muted">#{deger} — katalogda bulunamadı</span>
            ) : (
              <span className="muted">Stadyum seçilmemiş</span>
            )}
          </span>
          <span className="muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
            değiştir
          </span>
        </div>
        {secili && secili.takimSayisi > 1 && (
          <div style={{ fontSize: 11, color: "var(--warning)" }}>
            Bu stadyuma {secili.takimSayisi} takım bakıyor — burada yapılan
            stadyum düzeltmesi hepsinde görünür.
          </div>
        )}
        {secili?.taslak && (
          <div style={{ fontSize: 11, color: "var(--warning)" }}>
            Yer tutucu kayıt — gerçek bir stadyum seçilmeli.
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <input
        className="input"
        autoFocus
        value={q}
        placeholder="Stadyum ara (ad, özgün ad ya da şehir)"
        onChange={(e) => setQ(e.target.value)}
      />
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 8,
          maxHeight: 260,
          overflowY: "auto",
        }}
      >
        {q.trim().length < 2 ? (
          <div className="muted" style={{ fontSize: 12, padding: 10 }}>
            En az iki harf yaz. Türkçe harf şart değil: “mugla” da “Muğla”yı
            bulur.
          </div>
        ) : hata ? (
          <div style={{ fontSize: 12, padding: 10, color: "var(--danger)" }}>
            {hata}
          </div>
        ) : araniyor ? (
          <div className="muted" style={{ fontSize: 12, padding: 10 }}>
            aranıyor…
          </div>
        ) : sonuc.length === 0 ? (
          <div className="muted" style={{ fontSize: 12, padding: 10 }}>
            Eşleşen stadyum yok.
          </div>
        ) : (
          sonuc.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => sec(s)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                borderBottom: "1px solid var(--border)",
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              <span className="cell-title">{s.ad}</span>
              <span className="cell-sub">{stadyumAltYazi(s)}</span>
            </button>
          ))
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => {
            setAcik(false);
            setQ("");
          }}
        >
          Vazgeç
        </button>
        {deger.trim() !== "" && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            title="Takımın stadyumu bilinmiyor olarak işaretlenir"
            onClick={() => {
              onSec("");
              setSecili(null);
              setAcik(false);
              setQ("");
              onYazmayaBasla();
            }}
          >
            Boşalt
          </button>
        )}
      </div>
    </div>
  );
}

/** Seçici satırının alt yazısı: şehir · ülke · kapasite · kaç takım. */
function stadyumAltYazi(s: VeriStadyumu): string {
  const parcalar: string[] = [];
  if (s.sehir) parcalar.push(s.sehir);
  if (s.ulke) parcalar.push(s.ulke);
  if (s.kapasite) parcalar.push(`${s.kapasite.toLocaleString("tr-TR")} kişi`);
  if (s.ozgunAd && s.ozgunAd !== s.ad) parcalar.push(`özgün: ${s.ozgunAd}`);
  parcalar.push(
    s.takimSayisi === 0 ? "takım bağlı değil" : `${s.takimSayisi} takım`,
  );
  parcalar.push(`#${s.id}`);
  return parcalar.join(" · ");
}

function AlanSatiri({
  tur,
  id,
  alan,
  onDegisti,
}: {
  tur: string;
  id: number;
  alan: VeriAlanDurumu;
  onDegisti: () => Promise<void>;
}) {
  // Motor NULL alanları hiç göndermiyor, yani `yama !== null` yaması OLMAYAN
  // alanda da true döner. Tek yerde hesaplanıyor: iki kullanım yerine
  // kopyalansaydı biri düzeltilirken diğeri unutulurdu.
  const yamaliMi = alan.yama !== null && alan.yama !== undefined;
  // Seçicisi olan tek referans türü bugün VENUE. `PLAYER.team_id` de
  // `referans` ama seçicisi yok; orada eski sayı kutusu duruyor ve
  // "kimlik (sayı)" ipucu hâlâ anlamlı.
  const stadyumAlani = alan.tip === "referans" && alan.referansTur === "VENUE";
  const [deger, setDeger] = useState(alan.yama ?? alan.deger ?? "");
  const [gerekce, setGerekce] = useState(alan.gerekce ?? "");
  const [durum, setDurum] = useState<Durum>("");
  const [mesaj, setMesaj] = useState("");

  useEffect(() => {
    setDeger(alan.yama ?? alan.deger ?? "");
    setGerekce(alan.gerekce ?? "");
  }, [alan.yama, alan.deger, alan.gerekce]);

  async function kaydet(kaldir = false) {
    setDurum("kaydediliyor");
    setMesaj("");

    let yazildi = false;
    try {
      const r = await apiVeriYaz({
        tur,
        id,
        alan: alan.alan,
        deger: kaldir ? null : deger,
        gerekce: kaldir ? undefined : gerekce,
        kaldir,
      });
      yazildi = true;
      setDurum("ok");
      if (r.not) setMesaj(r.not);
    } catch (e) {
      setDurum("hata");
      setMesaj(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    }

    // TAZELEME AYRI TUTULUYOR — yama bu noktada ZATEN YAZILDI.
    //
    // Eskiden tek try içindeydi ve tazelemedeki bir hata "Kaydedilemedi."
    // yazdırıyordu. Yaşandı: eksik bir BFF rotası (`veri/oyuncular`) 404
    // dönüyordu, PUT başarılıyken ekranda hata görünüyor ve kullanıcı
    // yazılmış bir yamayı tekrar tekrar yazmaya çalışıyordu.
    //
    // Kayıt başarısızsa tazelemeye hiç girilmiyor: gösterilecek yeni bir
    // durum yok ve ikinci bir hata mesajı birinciyi örterdi.
    if (!yazildi) return;
    try {
      await onDegisti();
    } catch {
      setMesaj("Kaydedildi. (Liste tazelenemedi — sayfayı yenile.)");
    }
  }

  // Kullanıcı yeniden yazmaya başlayınca düğme "Kaydedildi ✓" durumundan
  // çıkıyor. Çıkmasaydı kaydetmeden SONRA düğme sonsuza kadar o metinde
  // kalırdı — tıklanabilir görünmez ve kullanıcı düğmenin kaybolduğunu
  // sanardı. Eski mesaj da siliniyor: yeni bir değer için eski not yanıltıcı.
  function yazmayaBasla() {
    if (durum !== "") setDurum("");
    if (mesaj !== "") setMesaj("");
  }

  return (
    <div
      style={{
        display: "grid",
        // ÜÇÜNCÜ SÜTUN SABİT — `auto` DEĞİL. İçeriğe göre ölçülseydi (ve
        // ölçülüyordu) kaydetmeden sonra düğmeler değiştiği an sütun
        // genişliği değişir ve İKİ INPUT birden yana kayardı: "Yamayı
        // kaldır" belirip kaybolduğunda ~100px, "Kaydet" metni kısaldığında
        // ~30px. Serhat'ın gördüğü kayma buydu.
        //
        // 140px TAHMİN DEĞİL: düğme metinleri headless Chromium'da
        // panelin kendi .btn-sm kuralıyla (12px/600, padding 6px 11px)
        // ölçüldü — "Kaydediliyor…" 121px (en genişi), "Yamayı kaldır"
        // 115px, "Kaydedildi ✓" 110px. Ölçüm Ubuntu yerine DejaVu Sans ile
        // yapıldı; o font DAHA GENİŞ, yani sayı üst sınır.
        gridTemplateColumns: "minmax(150px,1fr) minmax(200px,1.6fr) 140px",
        gap: 12,
        alignItems: "start",
      }}
    >
      <div style={{ paddingTop: 8 }}>
        <span className="label" style={{ marginBottom: 0, display: "inline" }}>
          {alan.etiket}
        </span>
        {yamaliMi && (
          <span
            className="badge badge-lang"
            style={{ marginLeft: 8 }}
            title="Elle yamalı — senkron dokunamıyor"
          >
            yamalı
          </span>
        )}
        {alan.tip === "referans" && !stadyumAlani && (
          <div className="cell-sub">kimlik (sayı)</div>
        )}
        {alan.sapma && (
          <div style={{ fontSize: 11, color: "var(--warning)", marginTop: 4 }}>
            Sağlayıcı artık &quot;{alan.saglayiciSonDeger}&quot; gönderiyor.
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {stadyumAlani ? (
          <StadyumSecici
            deger={deger}
            onSec={setDeger}
            onYazmayaBasla={yazmayaBasla}
          />
        ) : (
          <input
            className="input"
            value={deger}
            placeholder={alan.tip === "tarih" ? "YYYY-AA-GG" : ""}
            onChange={(e) => {
              setDeger(e.target.value);
              yazmayaBasla();
            }}
          />
        )}
        <input
          className="input"
          style={{ fontSize: 12 }}
          value={gerekce}
          placeholder="Gerekçe (zorunlu): bu değeri nereden aldın?"
          onChange={(e) => {
            setGerekce(e.target.value);
            yazmayaBasla();
          }}
        />
        {mesaj && (
          <div
            className={durum === "hata" ? undefined : "muted"}
            style={{
              fontSize: 11,
              ...(durum === "hata" ? { color: "var(--danger)" } : null),
            }}
          >
            {mesaj}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <button
          className="btn btn-sm"
          disabled={durum === "kaydediliyor"}
          onClick={() => kaydet(false)}
        >
          {durum === "kaydediliyor"
            ? "Kaydediliyor…"
            : durum === "ok"
              ? "Kaydedildi ✓"
              : "Kaydet"}
        </button>
        {yamaliMi && (
          <button
            className="btn btn-sm"
            onClick={() => kaydet(true)}
            title="Yamayı kaldır — sağlayıcının değeri bir sonraki senkron turunda geri gelir"
          >
            Yamayı kaldır
          </button>
        )}
      </div>
    </div>
  );
}
