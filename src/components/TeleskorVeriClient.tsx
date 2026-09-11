"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiVeriAlanlar,
  apiVeriEksik,
  apiVeriKayit,
  apiVeriOyuncular,
  apiVeriYaz,
  apiTeleskorLigAra,
  ApiError,
} from "@/lib/api-client";
import type {
  TakimEksigi,
  VeriAlanDurumu,
  VeriKaydi,
  VeriOyuncusu,
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
    setAcikTakim(null);
    setKayit(null);
    await raporuYukle(ligId);
  }

  async function takimAc(t: TakimEksigi) {
    setAcikTakim(t);
    setKayit(null);
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
      <div className="card card-pad">
        <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>Veri Düzeltme Masası</h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, opacity: 0.75 }}>
          Sağlayıcının eksik ya da yanlış gönderdiği alanları elle doldurur.
          Yazdığın değer <b>senkronla ezilmez</b>. Takım/oyuncu/stadyum{" "}
          <b>adları</b> için Çeviri Düzeltme sayfasını kullan.
        </p>

        <label style={{ fontSize: 13, fontWeight: 600 }}>Lig seç</label>
        <input
          className="input"
          placeholder="Lig ara (en az 2 harf) — örn. 2. Lig"
          value={ligAramasi}
          onChange={(e) => setLigAramasi(e.target.value)}
          style={{ marginTop: 6 }}
        />
        {ligSecenekleri.length > 0 && (
          <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
            {ligSecenekleri.map((l) => (
              <button
                key={l.ligId}
                className="btn btn-sm"
                style={{ justifyContent: "flex-start" }}
                onClick={() => ligSec(l.ligId, l.ad ?? `#${l.ligId}`)}
              >
                {l.ad ?? `#${l.ligId}`}
                {l.ulke ? (
                  <span style={{ opacity: 0.6 }}> · {l.ulke}</span>
                ) : null}
              </button>
            ))}
          </div>
        )}
        {lig && (
          <div style={{ marginTop: 10, fontSize: 14 }}>
            Seçili lig: <b>{lig.ad}</b>{" "}
            <button
              className="btn btn-sm"
              onClick={() => raporuYukle(lig.id)}
              style={{ marginLeft: 8 }}
            >
              Yenile
            </button>
          </div>
        )}
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}
      {yukleniyor && <div className="card card-pad">Yükleniyor…</div>}

      {!yukleniyor && lig && eksikler.length === 0 && !hata && (
        <div className="card card-pad">
          Bu ligde takım bulunamadı. (Kupa ve alt gruplarda takımlar fikstürden
          türetiliyor; fikstür henüz çekilmemiş olabilir.)
        </div>
      )}

      {eksikler.length > 0 && (
        <div className="card card-pad">
          <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>
            Eksik raporu — {eksikler.length} takım
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Takım</th>
                  <th>Stadyum</th>
                  <th>Kapasite</th>
                  <th>Şehir</th>
                  <th>Oyuncu</th>
                  <th>Mevki yok</th>
                  <th>Doğum yok</th>
                  <th>Boy yok</th>
                  <th>Boş kayıt</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {eksikler.map((t) => (
                  <tr key={t.takimId}>
                    <td>{t.takim}</td>
                    <td>{t.stadyum ?? <Eksik>yok</Eksik>}</td>
                    <td>{t.kapasiteVar ? "✓" : <Eksik>—</Eksik>}</td>
                    <td>{t.sehirVar ? "✓" : <Eksik>—</Eksik>}</td>
                    <td>{t.oyuncu}</td>
                    <td>{t.mevkiEksik > 0 ? <Eksik>{t.mevkiEksik}</Eksik> : "0"}</td>
                    <td>{t.dogumEksik > 0 ? <Eksik>{t.dogumEksik}</Eksik> : "0"}</td>
                    <td>{t.boyEksik > 0 ? <Eksik>{t.boyEksik}</Eksik> : "0"}</td>
                    <td>
                      {t.bosOyuncu > 0 ? <Eksik>{t.bosOyuncu}</Eksik> : "0"}
                    </td>
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

      {acikTakim && (
        <div className="card card-pad">
          <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>
            {acikTakim.takim}
          </h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
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
              <span style={{ fontSize: 13, opacity: 0.7, alignSelf: "center" }}>
                Stadyum bağlı değil — önce &quot;Takım bilgileri&quot; içinden
                stadyum seç.
              </span>
            )}
          </div>

          {oyuncular.length > 0 && (
            <div style={{ overflowX: "auto", marginBottom: 12 }}>
              <table className="table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Oyuncu</th>
                    <th>Mevki</th>
                    <th>Doğum</th>
                    <th>Boy</th>
                    <th>Eksik</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {oyuncular.map((o) => (
                    <tr key={o.id}>
                      <td>
                        {o.ad}
                        {o.yamali && (
                          <span title="Bu kayıtta elle yama var"> ✎</span>
                        )}
                      </td>
                      <td>{o.mevki ?? <Eksik>—</Eksik>}</td>
                      <td>{o.dogum ?? <Eksik>—</Eksik>}</td>
                      <td>{o.boy ?? <Eksik>—</Eksik>}</td>
                      <td>{o.eksik > 0 ? <Eksik>{o.eksik}</Eksik> : "0"}</td>
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
          )}
        </div>
      )}
    </div>
  );
}

function Eksik({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "#e5484d", fontWeight: 600 }}>{children}</span>;
}

/** Tek kaydın alanları: değer + gerekçe yazılıp kaydediliyor. */
function KayitDuzenle({
  kayit,
  onDegisti,
}: {
  kayit: VeriKaydi;
  onDegisti: () => Promise<void>;
}) {
  return (
    <div style={{ borderTop: "1px solid var(--border, #333)", paddingTop: 12 }}>
      <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>
        {kayit.ad}{" "}
        <span style={{ opacity: 0.6, fontWeight: 400 }}>
          ({kayit.tur} #{kayit.id})
        </span>
      </h4>
      <div style={{ display: "grid", gap: 10 }}>
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
    try {
      const r = await apiVeriYaz({
        tur,
        id,
        alan: alan.alan,
        deger: kaldir ? null : deger,
        gerekce: kaldir ? undefined : gerekce,
        kaldir,
      });
      setDurum("ok");
      if (r.not) setMesaj(r.not);
      await onDegisti();
    } catch (e) {
      setDurum("hata");
      setMesaj(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(140px,1fr) minmax(140px,1.4fr) auto",
        gap: 8,
        alignItems: "center",
      }}
    >
      <label style={{ fontSize: 13 }}>
        {alan.etiket}
        {yamaliMi && (
          <span title="Elle yamalı — senkron dokunamıyor"> ✎</span>
        )}
        {alan.tip === "referans" && (
          <span style={{ opacity: 0.6, fontSize: 11 }}> (kimlik)</span>
        )}
        {alan.sapma && (
          <div style={{ fontSize: 11, color: "#e5a23d", marginTop: 2 }}>
            Sağlayıcı artık &quot;{alan.saglayiciSonDeger}&quot; gönderiyor.
          </div>
        )}
      </label>
      <div style={{ display: "grid", gap: 4 }}>
        <input
          className="input"
          value={deger}
          placeholder={alan.tip === "tarih" ? "YYYY-AA-GG" : ""}
          onChange={(e) => setDeger(e.target.value)}
        />
        <input
          className="input"
          style={{ fontSize: 12 }}
          value={gerekce}
          placeholder="Gerekçe (zorunlu): bu değeri nereden aldın?"
          onChange={(e) => setGerekce(e.target.value)}
        />
        {mesaj && (
          <div
            style={{
              fontSize: 11,
              color: durum === "hata" ? "#e5484d" : "inherit",
              opacity: durum === "hata" ? 1 : 0.7,
            }}
          >
            {mesaj}
          </div>
        )}
      </div>
      <div style={{ display: "grid", gap: 4 }}>
        <button
          className="btn btn-sm"
          disabled={durum === "kaydediliyor"}
          onClick={() => kaydet(false)}
        >
          {durum === "kaydediliyor" ? "…" : durum === "ok" ? "✓" : "Kaydet"}
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
