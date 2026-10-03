"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { apiSiteHaritasiDenetle, apiSiteHaritasiDosya, apiSiteHaritasiOzet } from "@/lib/api-client";
import type {
  SiteHaritasiAdresDenetimi,
  SiteHaritasiAyarlari,
  SiteHaritasiDosyasi,
  SiteHaritasiOzeti,
} from "@/lib/types";
import { SIKLIK_AD, SITE, TUR_AD, adresTuru, hataMetni, kalipRegex, yolaCevir } from "./ortak";

const SAYI = new Intl.NumberFormat("tr-TR");

/** Başlık/açıklama için arama sonuçlarında genelde kesilmeden görünen uzunluk aralığı (yaygın kabul). */
const BASLIK_ARALIGI: [number, number] = [30, 60];
const ACIKLAMA_ARALIGI: [number, number] = [70, 160];

/** İnceleme: haritanın canlı özeti, dosya önizlemesi ve tek adres denetimi. */
export default function InceleKarti({ veri }: { veri: SiteHaritasiAyarlari }) {
  const [dosyaYolu, setDosyaYolu] = useState("/sitemap.xml");
  return (
    <div className="stack">
      <OzetKarti dosyaAc={setDosyaYolu} />
      <DosyaKarti yol={dosyaYolu} setYol={setDosyaYolu} />
      <DenetimKarti veri={veri} />
    </div>
  );
}

function OzetKarti({ dosyaAc }: { dosyaAc: (y: string) => void }) {
  const [ozet, setOzet] = useState<SiteHaritasiOzeti | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  const yukle = useCallback(async () => {
    setMesgul(true);
    setHata(null);
    try {
      setOzet(await apiSiteHaritasiOzet());
    } catch (e) {
      setHata(hataMetni(e, "Özet alınamadı."));
    } finally {
      setMesgul(false);
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const ilkDosya: Record<string, string> = {
    genel: "/sitemap-genel.xml",
    haber: "/haber/sitemap-haber.xml",
    lig: "/lig/sitemap/0.xml",
    takim: "/takim/sitemap/0.xml",
    oyuncu: "/oyuncu/sitemap/0.xml",
    td: "/teknik-direktor/sitemap/0.xml",
    hakem: "/hakem/sitemap/0.xml",
    mac: `/mac/sitemap/futbol-${new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date())}.xml`,
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Haritanın şu anki hâli</div>
        <button className="btn btn-sm" disabled={mesgul} onClick={() => void yukle()}>
          <RefreshCw size={14} /> {mesgul ? "Okunuyor…" : "Yenile"}
        </button>
      </div>
      <div className="card-pad">
        <div className="hint" style={{ marginBottom: 12 }}>
          Site haritası sitenin kendisinden okunur (arama motorunun gördüğü hâl). Kayıt sayısı lig,
          takım, oyuncu gibi sayfası olan kayıtların sayısıdır; bir kaydın birden çok adresi olabilir
          (lig sayfası, fikstürü, puan durumu…).
        </div>
        {hata && <div className="alert alert-error">{hata}</div>}
        {ozet?.hata && <div className="alert alert-warning">{ozet.hata}</div>}
        {ozet && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tür</th>
                  <th>Dosya</th>
                  <th>Kayıt</th>
                  <th>Adres</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ozet.turler.map((t) => (
                  <tr key={t.tur}>
                    <td>{TUR_AD[t.tur] ?? t.tur}</td>
                    <td>{t.dosya === 0 ? <span className="badge badge-archived">haritada değil</span> : SAYI.format(t.dosya)}</td>
                    <td>{t.kayit == null ? <span className="muted">—</span> : SAYI.format(t.kayit)}</td>
                    <td>
                      {t.adres == null ? <span className="muted">—</span> : SAYI.format(t.adres)}
                      {t.not && <div className="cell-sub">{t.not}</div>}
                    </td>
                    <td>
                      {t.dosya > 0 && (
                        <button className="btn btn-sm btn-ghost" onClick={() => dosyaAc(ilkDosya[t.tur])}>
                          Önizle
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="cell-sub" style={{ marginTop: 8 }}>
              Dizinde toplam {SAYI.format(ozet.toplamDosya)} dosya.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DosyaKarti({ yol, setYol }: { yol: string; setYol: (y: string) => void }) {
  const [girdi, setGirdi] = useState(yol);
  const [q, setQ] = useState("");
  const [dosya, setDosya] = useState<SiteHaritasiDosyasi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  const ac = useCallback(async (y: string, aranan: string) => {
    setMesgul(true);
    setHata(null);
    try {
      setDosya(await apiSiteHaritasiDosya(y, aranan));
    } catch (e) {
      setDosya(null);
      setHata(hataMetni(e, "Dosya okunamadı."));
    } finally {
      setMesgul(false);
    }
  }, []);

  // Özetteki "Önizle" ya da dizindeki bir dosyaya tıklanınca.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dışarıdan seçilen dosya kutuya yazılır (kasıtlı)
    setGirdi(yol);
    void ac(yol, "");
  }, [yol, ac]);

  function dosyaYolu(adres: string): string | null {
    const y = yolaCevir(adres);
    return y && y.endsWith(".xml") ? y : null;
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Dosya önizleme</div>
        <a href={`${SITE}${yol}`} target="_blank" rel="noreferrer" className="btn btn-sm">
          <ExternalLink size={14} /> Sitede aç
        </a>
      </div>
      <div className="card-pad">
        <div className="sh-form">
          <div className="field" style={{ margin: 0 }}>
            <label className="label">Dosya</label>
            <input
              className="input"
              value={girdi}
              onChange={(e) => setGirdi(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const y = dosyaYolu(girdi);
                  if (y) setYol(y);
                }
              }}
              placeholder="/sitemap.xml"
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label className="label">Adreste ara</label>
            <input
              className="input"
              value={q}
              placeholder="ör. galatasaray"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void ac(yol, q);
              }}
            />
          </div>
          <div className="sh-form-dugme">
            <button
              className="btn btn-primary"
              disabled={mesgul || !dosyaYolu(girdi)}
              onClick={() => {
                const y = dosyaYolu(girdi);
                if (!y) return;
                if (y === yol) void ac(y, q);
                else setYol(y);
              }}
            >
              {mesgul ? "Okunuyor…" : "Aç"}
            </button>
          </div>
        </div>
        {hata && (
          <div className="alert alert-error" style={{ marginTop: 10 }}>
            {hata}
          </div>
        )}
        {dosya && (
          <>
            <div className="cell-sub" style={{ margin: "10px 0" }}>
              {dosya.tur === "dizin" ? "Dizin" : "Adres listesi"}: {SAYI.format(dosya.toplam)} satır
              {dosya.eslesen !== dosya.toplam && `, aramaya uyan ${SAYI.format(dosya.eslesen)}`}
              {dosya.eslesen > dosya.satirlar.length && ` (ilk ${SAYI.format(dosya.satirlar.length)} gösteriliyor)`}
              {" · "}
              {SAYI.format(Math.round(dosya.boyut / 1024))} KB · {SAYI.format(dosya.sure)} ms
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Adres</th>
                    {dosya.tur === "adresler" && (
                      <>
                        <th>Öncelik</th>
                        <th>Sıklık</th>
                        <th>Son değişiklik</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {dosya.satirlar.map((s) => (
                    <tr key={s.loc}>
                      <td className="sh-yol">
                        {dosya.tur === "dizin" ? (
                          <button
                            className="sh-baglanti"
                            onClick={() => {
                              const y = dosyaYolu(s.loc);
                              if (y) setYol(y);
                            }}
                          >
                            {s.loc.replace(SITE, "")}
                          </button>
                        ) : (
                          <a href={s.loc} target="_blank" rel="noreferrer">
                            {s.loc.replace(SITE, "") || "/"}
                          </a>
                        )}
                      </td>
                      {dosya.tur === "adresler" && (
                        <>
                          <td>{s.priority ?? <span className="muted">—</span>}</td>
                          <td>{s.changefreq ? SIKLIK_AD[s.changefreq] ?? s.changefreq : <span className="muted">—</span>}</td>
                          <td className="cell-sub">{s.lastmod ? new Date(s.lastmod).toLocaleString("tr-TR") : "—"}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function uzunlukNotu(metin: string | null | undefined, [alt, ust]: [number, number]): string | null {
  if (!metin) return null;
  const n = [...metin].length;
  if (n < alt) return `${n} karakter (kısa; ${alt}-${ust} önerilir)`;
  if (n > ust) return `${n} karakter (uzun; arama sonucunda kesilebilir)`;
  return `${n} karakter`;
}

function Satir({ ad, children, uyari }: { ad: string; children: React.ReactNode; uyari?: string | null }) {
  return (
    <tr>
      <th className="sh-denetim-ad">{ad}</th>
      <td>
        {children}
        {uyari && <div className="cell-sub">{uyari}</div>}
      </td>
    </tr>
  );
}

function DenetimKarti({ veri }: { veri: SiteHaritasiAyarlari }) {
  const [adres, setAdres] = useState("");
  const [sonuc, setSonuc] = useState<SiteHaritasiAdresDenetimi | null>(null);
  const [haritada, setHaritada] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  /** Haritadaki durum: tür + tür açık mı + hariç kalıp; genel/haber için dosyada birebir arama. */
  const kural = useMemo(() => {
    if (!sonuc) return null;
    const yol = sonuc.yol.replace(/\?.*$/, "");
    const tur = adresTuru(yol);
    const turDurumu = veri.turler.find((t) => t.tur === tur);
    const uyan = veri.haricler.filter((h) => kalipRegex(h.kalip).test(yol));
    return { yol, tur, acik: turDurumu?.acik !== false, uyan };
  }, [sonuc, veri]);

  async function denetle() {
    const a = adres.trim();
    if (!a) return;
    setMesgul(true);
    setHata(null);
    setSonuc(null);
    setHaritada(null);
    try {
      const s = await apiSiteHaritasiDenetle(a);
      setSonuc(s);
      // Tek dosyalı türlerde birebir kontrol (genel; haber sayfası iki dosyada da olabilir).
      const yol = s.yol.replace(/\?.*$/, "");
      const tur = adresTuru(yol);
      if (tur === "genel" || tur === "haber") {
        const dosyalar = tur === "haber" ? ["/haber/sitemap-haber.xml", "/sitemap-genel.xml"] : ["/sitemap-genel.xml"];
        const bulunan: string[] = [];
        for (const d of dosyalar) {
          try {
            const icerik = await apiSiteHaritasiDosya(d, yol);
            if (icerik.satirlar.some((x) => x.loc === `${SITE}${yol}`)) bulunan.push(d);
          } catch {
            /* dosya kapalı/okunamadı: bulunamadı sayılır */
          }
        }
        setHaritada(bulunan.length ? `Haritada: ${bulunan.join(", ")}` : "Haritada yok");
      }
    } catch (e) {
      setHata(hataMetni(e, "Denetlenemedi."));
    } finally {
      setMesgul(false);
    }
  }

  const durumRozeti = (d: number) =>
    d >= 200 && d < 300 ? "badge-published" : d >= 300 && d < 400 ? "badge-scheduled" : "badge-archived";

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Adres denetimi</div>
      </div>
      <div className="card-pad">
        <div className="hint" style={{ marginBottom: 12 }}>
          Bir sayfayı arama motorunun göreceği gibi okur: durum kodu, yönlendirmeler, başlık,
          açıklama, canonical, dizine ekleme işaretleri, robots.txt, başlıklar (H1), paylaşım
          bilgileri ve yapısal veri. Yalnız sitenin kendi adresleri.
        </div>
        <div className="sh-form">
          <div className="field sh-genis" style={{ margin: 0, gridColumn: "span 2" }}>
            <label className="label">Adres</label>
            <input
              className="input"
              value={adres}
              placeholder="https://www.teleskor.com.tr/... ya da /futbol/takim/..."
              onChange={(e) => setAdres(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void denetle();
              }}
            />
          </div>
          <div className="sh-form-dugme">
            <button className="btn btn-primary" disabled={mesgul || !adres.trim()} onClick={() => void denetle()}>
              {mesgul ? "Okunuyor…" : "Denetle"}
            </button>
          </div>
        </div>
        {hata && (
          <div className="alert alert-error" style={{ marginTop: 10 }}>
            {hata}
          </div>
        )}
        {sonuc && kural && (
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table className="data-table sh-denetim">
              <tbody>
                <Satir ad="Durum">
                  <span className={`badge ${durumRozeti(sonuc.durum)}`}>{sonuc.durum}</span>{" "}
                  <span className="cell-sub">
                    {SAYI.format(sonuc.sure)} ms · {SAYI.format(Math.round(sonuc.boyut / 1024))} KB
                    {sonuc.icerikTuru ? ` · ${sonuc.icerikTuru}` : ""}
                  </span>
                </Satir>
                {sonuc.zincir.length > 1 && (
                  <Satir ad="Yönlendirmeler" uyari={sonuc.zincir.length > 2 ? "Birden çok yönlendirme var; tek adımda hedefe gitmesi önerilir." : null}>
                    {sonuc.zincir.map((z, i) => (
                      <div key={i} className="sh-yol">
                        {z.durum} {z.adres}
                        {z.konum ? ` → ${z.konum}` : ""}
                      </div>
                    ))}
                  </Satir>
                )}
                <Satir ad="Başlık (title)" uyari={uzunlukNotu(sonuc.baslik, BASLIK_ARALIGI)}>
                  {sonuc.baslik || <span className="muted">yok</span>}
                </Satir>
                <Satir ad="Açıklama" uyari={uzunlukNotu(sonuc.aciklama, ACIKLAMA_ARALIGI)}>
                  {sonuc.aciklama || <span className="muted">yok</span>}
                </Satir>
                <Satir
                  ad="Canonical"
                  uyari={
                    sonuc.canonical && sonuc.canonical.replace(/\/$/, "") !== `${SITE}${sonuc.yol}`.replace(/\/$/, "")
                      ? "Canonical başka bir adresi gösteriyor: arama motoru o adresi dizine ekler."
                      : null
                  }
                >
                  {sonuc.canonical ? <span className="sh-yol">{sonuc.canonical}</span> : <span className="muted">yok</span>}
                </Satir>
                <Satir ad="Dizine ekleme">
                  {sonuc.metaRobots || sonuc.xRobotsTag ? (
                    <>
                      {sonuc.metaRobots && <div>Sayfa içi: {sonuc.metaRobots}</div>}
                      {sonuc.xRobotsTag && <div>Yanıt başlığı: {sonuc.xRobotsTag}</div>}
                    </>
                  ) : (
                    <span>Kısıt yok (dizine eklenebilir)</span>
                  )}
                </Satir>
                <Satir ad="robots.txt">
                  {sonuc.robotsTxt.izinli ? "Taranabilir" : "Taranmaz"}
                  {sonuc.robotsTxt.kural && <span className="cell-sub"> ({sonuc.robotsTxt.kural})</span>}
                </Satir>
                <Satir ad="Site haritası">
                  <div>
                    Tür: {TUR_AD[kural.tur] ?? kural.tur} ({kural.acik ? "haritada açık" : "haritada KAPALI"})
                  </div>
                  {kural.uyan.length > 0 ? (
                    <div>Hariç kalıba uyuyor: {kural.uyan.map((h) => h.kalip + (h.noindex ? " (noindex)" : "")).join(", ")}</div>
                  ) : (
                    <div className="cell-sub">Hiçbir hariç kalıba uymuyor.</div>
                  )}
                  {haritada && <div>{haritada}</div>}
                  {!haritada && kural.acik && kural.uyan.length === 0 && (
                    <div className="cell-sub">Bu türde sayfanın haritaya girmesi verisine bağlıdır (ör. kadrosu olmayan takımın kadro sayfası yazılmaz).</div>
                  )}
                </Satir>
                <Satir ad="H1" uyari={sonuc.h1.length === 0 ? "Sayfada H1 yok." : sonuc.h1.length > 1 ? `${sonuc.h1.length} tane H1 var.` : null}>
                  {sonuc.h1.length ? sonuc.h1.map((h, i) => <div key={i}>{h}</div>) : <span className="muted">yok</span>}
                </Satir>
                <Satir ad="Dil">{sonuc.dil ?? <span className="muted">belirtilmemiş</span>}</Satir>
                <Satir ad="Paylaşım (Open Graph)">
                  <div>{sonuc.ogBaslik ?? <span className="muted">başlık yok</span>}</div>
                  {sonuc.ogAciklama && <div className="cell-sub">{sonuc.ogAciklama}</div>}
                  {sonuc.ogGorsel && (
                    <div className="sh-yol cell-sub">
                      Görsel: <a href={sonuc.ogGorsel} target="_blank" rel="noreferrer">{sonuc.ogGorsel}</a>
                    </div>
                  )}
                </Satir>
                <Satir ad="Yapısal veri">
                  {sonuc.yapisalVeri.length ? sonuc.yapisalVeri.join(", ") : <span className="muted">yok</span>}
                </Satir>
                {sonuc.hreflang.length > 0 && (
                  <Satir ad="Dil alternatifleri">
                    {sonuc.hreflang.map((h) => (
                      <div key={h.dil + h.adres} className="sh-yol">
                        {h.dil}: {h.adres}
                      </div>
                    ))}
                  </Satir>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
