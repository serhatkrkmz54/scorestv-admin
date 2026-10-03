"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import {
  apiSiteHaritasi,
  apiSiteHaritasiEkAdresEkle,
  apiSiteHaritasiEkAdresSil,
  apiSiteHaritasiHaricEkle,
  apiSiteHaritasiHaricNoindex,
  apiSiteHaritasiHaricSil,
  apiSiteHaritasiTur,
} from "@/lib/api-client";
import type { SiteHaritasiAyarlari, SiteHaritasiTuru } from "@/lib/types";
import {
  ONCELIKLER,
  SIKLIKLAR,
  SIKLIK_AD,
  SITE,
  hataMetni,
  kalipRegex,
  onceligiYaz,
  tarih,
  yolHatasi,
  yolaCevir,
} from "./site-haritasi/ortak";
import RobotsKarti from "./site-haritasi/RobotsKarti";
import InceleKarti from "./site-haritasi/InceleKarti";
import IndexNowKarti from "./site-haritasi/IndexNowKarti";
import GecmisKarti from "./site-haritasi/GecmisKarti";
import BilgiKarti from "./site-haritasi/BilgiKarti";
import SayfaBasliklariKarti from "./site-haritasi/SayfaBasliklariKarti";

type Sekme = "kurallar" | "sayfalar" | "robots" | "incele" | "bildir" | "gecmis" | "bilgi";

const SEKMELER: { kod: Sekme; ad: string }[] = [
  { kod: "kurallar", ad: "Harita kuralları" },
  { kod: "sayfalar", ad: "Sayfa başlıkları" },
  { kod: "robots", ad: "robots.txt" },
  { kod: "incele", ad: "İnceleme" },
  { kod: "bildir", ad: "Arama motoruna bildir" },
  { kod: "gecmis", ad: "Değişiklik geçmişi" },
  { kod: "bilgi", ad: "Nasıl çalışır" },
];

/** Seçili sekme adres çubuğunda (?sekme=): bağlantı paylaşılınca aynı sekme açılır. */
function sekmeOku(): Sekme {
  if (typeof window === "undefined") return "kurallar";
  const s = new URLSearchParams(window.location.search).get("sekme");
  return SEKMELER.some((x) => x.kod === s) ? (s as Sekme) : "kurallar";
}

/**
 * SİTE HARİTASI (3 Ekim) — arama motorlarına verilen haritanın ayarları.
 *
 * <p>ADMIN ve SEO rolü. Haritalar yine siteden otomatik üretilir; buradaki
 * ayarlar onun üstüne uygulanır ve birkaç saniye içinde yansır. Her
 * değişiklik denetim kaydına yazılır (kim, ne zaman, önce → sonra).
 */
export default function TeleskorSiteHaritasiClient() {
  const [veri, setVeri] = useState<SiteHaritasiAyarlari | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sekme, setSekme] = useState<Sekme>("kurallar");
  /** İnceleme → "Başlığını düzenle": Sayfa başlıkları sekmesi bu adresle açılır. */
  const [duzenlenecek, setDuzenlenecek] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- adres çubuğundan tek seferlik okuma (kasıtlı)
    setSekme(sekmeOku());
  }, []);

  function sekmeSec(s: Sekme) {
    setSekme(s);
    const u = new URL(window.location.href);
    if (s === "kurallar") u.searchParams.delete("sekme");
    else u.searchParams.set("sekme", s);
    window.history.replaceState(null, "", u.toString());
  }

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      setVeri(await apiSiteHaritasi());
    } catch (e) {
      setHata(hataMetni(e, "Ayarlar okunamadı."));
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  function bildir(metin: string) {
    setHata(null);
    setBilgi(metin);
    window.setTimeout(() => setBilgi((b) => (b === metin ? null : b)), 5000);
  }

  return (
    <div className="stack">
      <div>
        <h2 className="page-title">Site Haritası</h2>
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
          Arama motorlarına verilen site haritasının ayarları. Harita siteden otomatik üretilir;
          buradaki ayarlar onun üstüne uygulanır ve birkaç saniye içinde yansır. Her değişiklik
          kimin yaptığıyla birlikte kayda geçer.
        </div>
        <div className="sh-baglantilar">
          <a href={`${SITE}/sitemap.xml`} target="_blank" rel="noreferrer" className="btn btn-sm">
            <ExternalLink size={14} /> sitemap.xml
          </a>
          <a href={`${SITE}/sitemap-genel.xml`} target="_blank" rel="noreferrer" className="btn btn-sm">
            <ExternalLink size={14} /> Genel harita
          </a>
          <a href={`${SITE}/robots.txt`} target="_blank" rel="noreferrer" className="btn btn-sm">
            <ExternalLink size={14} /> robots.txt
          </a>
        </div>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}
      {bilgi && <div className="alert alert-success">{bilgi}</div>}
      {yukleniyor && !veri && <div className="card card-pad muted">Yükleniyor…</div>}

      <div className="tabs" role="tablist">
        {SEKMELER.map((t) => (
          <button
            key={t.kod}
            role="tab"
            aria-selected={sekme === t.kod}
            className={`tab ${sekme === t.kod ? "active" : ""}`}
            onClick={() => sekmeSec(t.kod)}
          >
            {t.ad}
          </button>
        ))}
      </div>

      {veri && sekme === "kurallar" && (
        <>
          <TurlerKarti veri={veri} setVeri={setVeri} bildir={bildir} />
          <EkAdreslerKarti veri={veri} yenile={yukle} bildir={bildir} />
          <HariclerKarti veri={veri} setVeri={setVeri} yenile={yukle} bildir={bildir} />
        </>
      )}
      {veri && sekme === "robots" && <RobotsKarti veri={veri} yenile={yukle} bildir={bildir} />}
      {sekme === "sayfalar" && <SayfaBasliklariKarti ilkAdres={duzenlenecek} bildir={bildir} />}
      {veri && sekme === "incele" && (
        <InceleKarti
          veri={veri}
          baslikDuzenle={(a) => {
            setDuzenlenecek(a);
            sekmeSec("sayfalar");
            window.scrollTo({ top: 0 });
          }}
        />
      )}
      {veri && sekme === "bildir" && <IndexNowKarti veri={veri} yenile={yukle} bildir={bildir} />}
      {sekme === "gecmis" && <GecmisKarti />}
      {sekme === "bilgi" && <BilgiKarti />}
    </div>
  );
}

// ---- Türler ----

function TurlerKarti({
  veri,
  setVeri,
  bildir,
}: {
  veri: SiteHaritasiAyarlari;
  setVeri: (v: SiteHaritasiAyarlari) => void;
  bildir: (m: string) => void;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Sayfa türleri</div>
      </div>
      <div className="card-pad">
        <div className="hint" style={{ marginBottom: 12 }}>
          Kapatılan tür haritadan bütünüyle çıkar (sayfalar sitede kalır, yalnız haritada yer
          almaz). Öncelik ve sıklık boşsa sitenin kendi değerleri kullanılır; seçilirse o türün
          bütün adreslerine yazılır. Google bu iki değeri dikkate almadığını belirtiyor, diğer
          arama motorları okuyabilir.
        </div>
        <div className="sh-turler">
          {veri.turler.map((t) => (
            <TurSatiri key={t.tur} tur={t} setVeri={setVeri} bildir={bildir} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TurSatiri({
  tur,
  setVeri,
  bildir,
}: {
  tur: SiteHaritasiTuru;
  setVeri: (v: SiteHaritasiAyarlari) => void;
  bildir: (m: string) => void;
}) {
  const [acik, setAcik] = useState(tur.acik);
  const [oncelik, setOncelik] = useState(onceligiYaz(tur.oncelik));
  const [siklik, setSiklik] = useState(tur.siklik ?? "");
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [kapatmaOnayi, setKapatmaOnayi] = useState(false);

  // Sunucudan yeni değer gelince taslak ona eşitlenir (başka satır kaydedilince de).
  useEffect(() => {
    setAcik(tur.acik);
    setOncelik(onceligiYaz(tur.oncelik));
    setSiklik(tur.siklik ?? "");
  }, [tur.acik, tur.oncelik, tur.siklik]);

  const degisti =
    acik !== tur.acik || oncelik !== onceligiYaz(tur.oncelik) || siklik !== (tur.siklik ?? "");
  const ozel = !tur.acik || tur.oncelik != null || !!tur.siklik;

  async function kaydet(istek: { acik: boolean; oncelik: number | null; siklik: string | null }, mesaj: string) {
    setMesgul(true);
    setHata(null);
    try {
      setVeri(await apiSiteHaritasiTur(tur.tur, istek));
      bildir(mesaj);
    } catch (e) {
      setHata(hataMetni(e, "Kaydedilemedi."));
    } finally {
      setMesgul(false);
      setKapatmaOnayi(false);
    }
  }

  function kaydetTikla() {
    if (tur.acik && !acik && !kapatmaOnayi) {
      setKapatmaOnayi(true);
      return;
    }
    void kaydet(
      { acik, oncelik: oncelik === "" ? null : Number(oncelik), siklik: siklik || null },
      `${tur.ad}: kaydedildi.`,
    );
  }

  return (
    <div className={`sh-tur ${tur.acik ? "" : "sh-kapali"}`}>
      <div className="sh-tur-bas">
        <div style={{ minWidth: 0 }}>
          <div className="sh-tur-ad">
            {tur.ad}
            {!tur.acik && <span className="badge badge-archived">haritada değil</span>}
          </div>
          <div className="t-hint">{tur.aciklama}</div>
          {tur.guncelleyen && (
            <div className="t-hint">
              Son değişiklik: {tur.guncelleyen}, {tarih(tur.guncellendi)}
            </div>
          )}
        </div>
        <label className="switch" title={acik ? "Haritada" : "Haritada değil"}>
          <input
            type="checkbox"
            checked={acik}
            disabled={mesgul}
            onChange={(e) => {
              setAcik(e.target.checked);
              setKapatmaOnayi(false);
            }}
          />
          <span className="slider" />
        </label>
      </div>

      <div className="sh-tur-alanlar">
        <div className="field" style={{ margin: 0 }}>
          <label className="label">Öncelik</label>
          <select
            className="select"
            value={oncelik}
            disabled={mesgul || !acik}
            onChange={(e) => setOncelik(e.target.value)}
          >
            <option value="">Sitenin değeri</option>
            {ONCELIKLER.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label className="label">Değişme sıklığı</label>
          <select
            className="select"
            value={siklik}
            disabled={mesgul || !acik}
            onChange={(e) => setSiklik(e.target.value)}
          >
            <option value="">Sitenin değeri</option>
            {SIKLIKLAR.map(([k, ad]) => (
              <option key={k} value={k}>
                {ad}
              </option>
            ))}
          </select>
        </div>
        <div className="sh-tur-dugmeler">
          <button
            className={`btn btn-sm ${kapatmaOnayi ? "btn-danger" : "btn-primary"}`}
            disabled={!degisti || mesgul}
            onClick={kaydetTikla}
          >
            {mesgul ? "Kaydediliyor…" : kapatmaOnayi ? "Evet, haritadan çıkar" : "Kaydet"}
          </button>
          {ozel && !degisti && (
            <button
              className="btn btn-sm btn-ghost"
              disabled={mesgul}
              onClick={() =>
                void kaydet({ acik: true, oncelik: null, siklik: null }, `${tur.ad}: varsayılana döndü.`)
              }
            >
              Varsayılana dön
            </button>
          )}
        </div>
      </div>
      {kapatmaOnayi && (
        <div className="alert alert-warning" style={{ marginTop: 10, marginBottom: 0 }}>
          &quot;{tur.ad}&quot; haritadan bütünüyle çıkacak; bu sayfalar arama motorlarına artık
          haritayla bildirilmeyecek. Onaylıyorsanız düğmeye bir kez daha basın.
        </div>
      )}
      {hata && (
        <div className="alert alert-error" style={{ marginTop: 10, marginBottom: 0 }}>
          {hata}
        </div>
      )}
    </div>
  );
}

// ---- Ek adresler ----

function EkAdreslerKarti({
  veri,
  yenile,
  bildir,
}: {
  veri: SiteHaritasiAyarlari;
  yenile: () => Promise<void>;
  bildir: (m: string) => void;
}) {
  const [adres, setAdres] = useState("");
  const [oncelik, setOncelik] = useState("");
  const [siklik, setSiklik] = useState("");
  const [not, setNot] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const yol = yolaCevir(adres);
  const yerelHata = adres.trim() === "" ? null : yol == null ? "Yalnız sitenin kendi adresleri (www.teleskor.com.tr) eklenebilir." : yolHatasi(yol, false);

  async function ekle() {
    if (!yol || yerelHata) return;
    setMesgul(true);
    setHata(null);
    try {
      await apiSiteHaritasiEkAdresEkle({
        yol,
        oncelik: oncelik === "" ? null : Number(oncelik),
        siklik: siklik || null,
        not: not.trim(),
      });
      setAdres("");
      setNot("");
      await yenile();
      bildir(`Eklendi: ${yol}`);
    } catch (e) {
      setHata(hataMetni(e, "Eklenemedi."));
    } finally {
      setMesgul(false);
    }
  }

  async function sil(id: number, y: string) {
    if (!window.confirm(`${y} haritadan kaldırılsın mı?`)) return;
    setHata(null);
    try {
      await apiSiteHaritasiEkAdresSil(id);
      await yenile();
      bildir(`Kaldırıldı: ${y}`);
    } catch (e) {
      setHata(hataMetni(e, "Kaldırılamadı."));
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Ek adresler ({veri.ekAdresler.length})</div>
      </div>
      <div className="card-pad">
        <div className="hint" style={{ marginBottom: 12 }}>
          Genel haritaya elle eklenen sayfalar (otomatik üretimin kapsamadığı açılış sayfaları
          gibi). Tam adres ya da kökten yol yazılabilir. Haritada zaten olan adres ikinci kez
          yazılmaz; hariç kalıba uyan adres eklense de haritaya girmez.
        </div>
        <div className="sh-form">
          <div className="field sh-genis" style={{ margin: 0 }}>
            <label className="label">Adres</label>
            <input
              className="input"
              value={adres}
              placeholder="/futbol/turkiye-super-lig ya da tam adres"
              maxLength={600}
              onChange={(e) => setAdres(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void ekle();
              }}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label className="label">Öncelik</label>
            <select className="select" value={oncelik} onChange={(e) => setOncelik(e.target.value)}>
              <option value="">Genel türün değeri</option>
              {ONCELIKLER.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label className="label">Değişme sıklığı</label>
            <select className="select" value={siklik} onChange={(e) => setSiklik(e.target.value)}>
              <option value="">Genel türün değeri</option>
              {SIKLIKLAR.map(([k, ad]) => (
                <option key={k} value={k}>
                  {ad}
                </option>
              ))}
            </select>
          </div>
          <div className="field sh-genis" style={{ margin: 0 }}>
            <label className="label">Not (isteğe bağlı)</label>
            <input
              className="input"
              value={not}
              maxLength={300}
              placeholder="Neden eklendi"
              onChange={(e) => setNot(e.target.value)}
            />
          </div>
          <div className="sh-form-dugme">
            <button
              className="btn btn-primary"
              disabled={mesgul || !yol || !!yerelHata}
              onClick={() => void ekle()}
            >
              {mesgul ? "Ekleniyor…" : "Ekle"}
            </button>
          </div>
        </div>
        {yol && !yerelHata && adres.trim() !== yol && (
          <div className="t-hint" style={{ marginTop: 6 }}>
            Kaydedilecek yol: {yol}
          </div>
        )}
        {yerelHata && <div className="field-error" style={{ marginTop: 6 }}>{yerelHata}</div>}
        {hata && (
          <div className="alert alert-error" style={{ marginTop: 10 }}>
            {hata}
          </div>
        )}

        {veri.ekAdresler.length === 0 ? (
          <div className="muted" style={{ fontSize: 13, marginTop: 14 }}>
            Elle eklenmiş adres yok.
          </div>
        ) : (
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Adres</th>
                  <th>Öncelik</th>
                  <th>Sıklık</th>
                  <th>Not</th>
                  <th>Ekleyen</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {veri.ekAdresler.map((e) => (
                  <tr key={e.id}>
                    <td className="sh-yol">
                      <a href={`${SITE}${e.yol}`} target="_blank" rel="noreferrer">
                        {e.yol}
                      </a>
                    </td>
                    <td>{onceligiYaz(e.oncelik) || <span className="muted">genel</span>}</td>
                    <td>{e.siklik ? SIKLIK_AD[e.siklik] ?? e.siklik : <span className="muted">genel</span>}</td>
                    <td>{e.not || <span className="muted">—</span>}</td>
                    <td className="cell-sub">
                      {e.ekleyen ?? "—"}
                      <br />
                      {tarih(e.eklendi)}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-ghost"
                        title="Kaldır"
                        aria-label="Kaldır"
                        onClick={() => void sil(e.id, e.yol)}
                      >
                        <Trash2 size={15} />
                      </button>
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

// ---- Hariç kalıplar ----

function HariclerKarti({
  veri,
  setVeri,
  yenile,
  bildir,
}: {
  veri: SiteHaritasiAyarlari;
  setVeri: (v: SiteHaritasiAyarlari) => void;
  yenile: () => Promise<void>;
  bildir: (m: string) => void;
}) {
  const [kalip, setKalip] = useState("");
  const [noindex, setNoindex] = useState(false);
  const [not, setNot] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [deneme, setDeneme] = useState("");

  const temizKalip = yolaCevir(kalip);
  const yerelHata =
    kalip.trim() === ""
      ? null
      : temizKalip == null
        ? "Kalıp \"/\" ile başlamalı (sitenin kökünden yol)."
        : yolHatasi(temizKalip, true);

  const denemeSonucu = useMemo((): {
    hata?: string;
    sonuc?: { yol: string; uyan: string[] };
  } | null => {
    const y = yolaCevir(deneme);
    if (!deneme.trim()) return null;
    if (y == null) return { hata: "Sitenin kendi adresi ya da \"/\" ile başlayan yol yazın." };
    const yalinYol = y.replace(/[?#].*$/, "") || "/";
    const kalanlar = [...veri.haricler.map((h) => h.kalip), ...(temizKalip && !yerelHata ? [temizKalip] : [])];
    const uyan = kalanlar.filter((k) => kalipRegex(k).test(yalinYol));
    return { sonuc: { yol: yalinYol, uyan } };
  }, [deneme, veri.haricler, temizKalip, yerelHata]);

  async function ekle() {
    if (!temizKalip || yerelHata) return;
    setMesgul(true);
    setHata(null);
    try {
      await apiSiteHaritasiHaricEkle({ kalip: temizKalip, noindex, not: not.trim() });
      setKalip("");
      setNot("");
      setNoindex(false);
      await yenile();
      bildir(`Hariç kalıp eklendi: ${temizKalip}`);
    } catch (e) {
      setHata(hataMetni(e, "Eklenemedi."));
    } finally {
      setMesgul(false);
    }
  }

  async function noindexDegistir(id: number, k: string, deger: boolean) {
    if (
      deger &&
      !window.confirm(
        `"${k}" kalıbına uyan sayfalar arama motorlarına "dizine ekleme" diye işaretlenecek; ` +
          "zamanla arama sonuçlarından düşerler. Devam edilsin mi?",
      )
    )
      return;
    setHata(null);
    try {
      setVeri(await apiSiteHaritasiHaricNoindex(id, deger));
      bildir(`${k}: noindex ${deger ? "açıldı" : "kapatıldı"}.`);
    } catch (e) {
      setHata(hataMetni(e, "Kaydedilemedi."));
    }
  }

  async function sil(id: number, k: string) {
    if (!window.confirm(`"${k}" kalıbı kaldırılsın mı? Uyan sayfalar haritaya geri döner (noindex de kalkar).`)) return;
    setHata(null);
    try {
      await apiSiteHaritasiHaricSil(id);
      await yenile();
      bildir(`Kaldırıldı: ${k}`);
    } catch (e) {
      setHata(hataMetni(e, "Kaldırılamadı."));
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Hariç kalıplar ({veri.haricler.length})</div>
      </div>
      <div className="card-pad">
        <div className="hint" style={{ marginBottom: 12 }}>
          Kalıba uyan adresler bütün haritalardan çıkarılır (sayfanın kendisi sitede kalır).
          <b> *</b> herhangi bir şey demek; kalıp yolun tamamıyla eşleşir. Örnekler:{" "}
          <code>/futbol/takim/*/kadro</code> bütün takımların kadro sayfaları,{" "}
          <code>/haber/*</code> bütün haber sayfaları, <code>/tv</code> yalnız o sayfa.
          <br />
          <b>noindex</b> işaretlenirse sayfalar yalnız haritadan çıkmaz, arama motorlarına
          &quot;dizine ekleme&quot; de denir (sayfa ziyaretçiye açık kalır, en geç bir dakikada
          etkinleşir). Ana sayfayı ya da harita dosyalarını kapsayan kalıpta noindex açılamaz.
        </div>
        <div className="sh-form">
          <div className="field sh-genis" style={{ margin: 0 }}>
            <label className="label">Kalıp</label>
            <input
              className="input"
              value={kalip}
              placeholder="/futbol/takim/*/kadro"
              maxLength={600}
              onChange={(e) => setKalip(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void ekle();
              }}
            />
          </div>
          <div className="field sh-genis" style={{ margin: 0 }}>
            <label className="label">Not (isteğe bağlı)</label>
            <input
              className="input"
              value={not}
              maxLength={300}
              placeholder="Neden çıkarıldı"
              onChange={(e) => setNot(e.target.value)}
            />
          </div>
          <label className="check-row sh-noindex">
            <input type="checkbox" checked={noindex} onChange={(e) => setNoindex(e.target.checked)} />
            <span>noindex de uygula</span>
          </label>
          <div className="sh-form-dugme">
            <button
              className="btn btn-primary"
              disabled={mesgul || !temizKalip || !!yerelHata}
              onClick={() => void ekle()}
            >
              {mesgul ? "Ekleniyor…" : "Ekle"}
            </button>
          </div>
        </div>
        {yerelHata && <div className="field-error" style={{ marginTop: 6 }}>{yerelHata}</div>}
        {hata && (
          <div className="alert alert-error" style={{ marginTop: 10 }}>
            {hata}
          </div>
        )}

        <div className="sh-deneme">
          <div className="field" style={{ margin: 0 }}>
            <label className="label">Kalıp denemesi</label>
            <input
              className="input"
              value={deneme}
              placeholder="Bir adres yapıştırın: haritada kalır mı, çıkar mı?"
              onChange={(e) => setDeneme(e.target.value)}
            />
          </div>
          {denemeSonucu?.hata && (
            <div className="field-error" style={{ marginTop: 6 }}>{denemeSonucu.hata}</div>
          )}
          {denemeSonucu?.sonuc && (
            <div
              className={`alert ${denemeSonucu.sonuc.uyan.length ? "alert-warning" : "alert-success"}`}
              style={{ marginTop: 8, marginBottom: 0 }}
            >
              {denemeSonucu.sonuc.uyan.length ? (
                <>
                  <b>{denemeSonucu.sonuc.yol}</b> haritadan çıkarılır. Uyan kalıp:{" "}
                  {denemeSonucu.sonuc.uyan.join(", ")}
                  {temizKalip &&
                  denemeSonucu.sonuc.uyan.includes(temizKalip) &&
                  !veri.haricler.some((h) => h.kalip === temizKalip)
                    ? " (henüz eklenmedi)"
                    : ""}
                </>
              ) : (
                <>
                  <b>{denemeSonucu.sonuc.yol}</b> hiçbir kalıba uymuyor; türü açıksa haritada kalır.
                </>
              )}
            </div>
          )}
        </div>

        {veri.haricler.length === 0 ? (
          <div className="muted" style={{ fontSize: 13, marginTop: 14 }}>
            Hariç kalıp yok.
          </div>
        ) : (
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kalıp</th>
                  <th>noindex</th>
                  <th>Not</th>
                  <th>Ekleyen</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {veri.haricler.map((h) => (
                  <tr key={h.id}>
                    <td className="sh-yol">
                      <code>{h.kalip}</code>
                    </td>
                    <td>
                      <label className="switch" title={h.noindex ? "noindex açık" : "yalnız haritadan çıkar"}>
                        <input
                          type="checkbox"
                          checked={h.noindex}
                          aria-label={`${h.kalip} noindex`}
                          onChange={(e) => void noindexDegistir(h.id, h.kalip, e.target.checked)}
                        />
                        <span className="slider" />
                      </label>
                    </td>
                    <td>{h.not || <span className="muted">—</span>}</td>
                    <td className="cell-sub">
                      {h.ekleyen ?? "—"}
                      <br />
                      {tarih(h.eklendi)}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-ghost"
                        title="Kaldır"
                        aria-label="Kaldır"
                        onClick={() => void sil(h.id, h.kalip)}
                      >
                        <Trash2 size={15} />
                      </button>
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
