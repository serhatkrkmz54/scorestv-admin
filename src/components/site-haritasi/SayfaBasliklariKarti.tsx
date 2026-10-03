"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { apiSayfaMetaListe, apiSayfaMetaSil, apiSayfaMetaYaz, apiSiteHaritasiDenetle } from "@/lib/api-client";
import type { SayfaMetaListesi } from "@/lib/types";
import { SITE, hataMetni, tarih, yolaCevir } from "./ortak";

/** Arama sonucunda genelde kesilmeden görünen uzunluk (yaygın kabul; kesin sınır piksel genişliği). */
const BASLIK_ARALIGI: [number, number] = [30, 60];
const ACIKLAMA_ARALIGI: [number, number] = [70, 160];
const BASLIK_EN_COK = 200;
const ACIKLAMA_EN_COK = 400;

function uzunluk(metin: string, [alt, ust]: [number, number]): { metin: string; uyari: boolean } {
  const n = [...metin.trim()].length;
  if (n === 0) return { metin: "boş: sitenin kendi değeri kullanılır", uyari: false };
  if (n < alt) return { metin: `${n} karakter (kısa; ${alt}-${ust} önerilir)`, uyari: true };
  if (n > ust) return { metin: `${n} karakter (arama sonucunda kesilebilir; ${alt}-${ust} önerilir)`, uyari: true };
  return { metin: `${n} karakter`, uyari: false };
}

/**
 * SAYFA BAŞLIKLARI (V74): tek bir sayfanın başlığını ve/veya açıklamasını elle
 * yazar. Anahtar sayfanın canonical yolu; "Sayfadan getir" sayfayı okuyup
 * canonical'ı ve şu anki değerleri doldurur. Boş alan = sitenin kendi değeri.
 */
export default function SayfaBasliklariKarti({
  ilkAdres,
  bildir,
}: {
  ilkAdres?: string | null;
  bildir: (m: string) => void;
}) {
  const [adres, setAdres] = useState(ilkAdres ?? "");
  const [yol, setYol] = useState<string | null>(null);
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [not, setNot] = useState("");
  const [simdiki, setSimdiki] = useState<{ baslik: string | null; aciklama: string | null } | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  const [q, setQ] = useState("");
  const [sayfa, setSayfa] = useState(0);
  const [liste, setListe] = useState<SayfaMetaListesi | null>(null);
  const [listeHata, setListeHata] = useState<string | null>(null);

  const listeYukle = useCallback(async (aranan: string, s: number) => {
    setListeHata(null);
    try {
      setListe(await apiSayfaMetaListe(aranan, s));
    } catch (e) {
      setListeHata(hataMetni(e, "Liste alınamadı."));
    }
  }, []);

  useEffect(() => {
    void listeYukle(q, sayfa);
    // q yazılırken değil, Enter/Ara ile aranır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sayfa, listeYukle]);

  /** Sayfayı okuyup canonical yolunu ve şu anki başlık/açıklamayı getirir. */
  const getir = useCallback(
    async (a: string, kayit?: { baslik?: string | null; aciklama?: string | null; not?: string | null }) => {
      const ham = a.trim();
      if (!ham) return;
      setMesgul(true);
      setHata(null);
      setBilgi(null);
      try {
        const d = await apiSiteHaritasiDenetle(ham);
        if (d.durum !== 200) {
          setHata(`Sayfa ${d.durum} döndü; yalnız açılan sayfaların başlığı düzenlenebilir.`);
          setYol(null);
          return;
        }
        const canonical = d.canonical ? yolaCevir(d.canonical) : null;
        const y = canonical ?? d.yol.replace(/\?.*$/, "");
        setYol(y);
        setSimdiki({ baslik: d.baslik ?? null, aciklama: d.aciklama ?? null });
        if (d.metaRobots && /noindex/i.test(d.metaRobots)) {
          setBilgi("Bu sayfa arama motorlarına kapalı (noindex); başlığı aramada görünmez.");
        } else if (canonical && canonical !== d.yol.replace(/\?.*$/, "")) {
          setBilgi(`Bu adresin asıl (canonical) adresi ${y}; kayıt o adres için yazılır.`);
        }
        // Bu yol için kayıt varsa onunla doldur (yoksa boş = sitenin kendi değeri).
        let k = kayit;
        if (!k) {
          try {
            k = (await apiSayfaMetaListe(y, 0)).kayitlar.find((x) => x.yol === y);
          } catch {
            k = undefined;
          }
        }
        if (k) setBilgi((b) => b ?? "Bu sayfa için elle yazılmış başlık/açıklama var; aşağıda düzenleyebilirsiniz.");
        setBaslik(k?.baslik ?? "");
        setAciklama(k?.aciklama ?? "");
        setNot(k?.not ?? "");
      } catch (e) {
        setHata(hataMetni(e, "Sayfa okunamadı."));
        setYol(null);
      } finally {
        setMesgul(false);
      }
    },
    [],
  );

  // Başka sekmeden (İnceleme → "Başlığını düzenle") gelinince.
  useEffect(() => {
    if (ilkAdres) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- dışarıdan gelen adres kutuya yazılır (kasıtlı)
      setAdres(ilkAdres);
      void getir(ilkAdres);
    }
  }, [ilkAdres, getir]);

  async function kaydet() {
    if (!yol) return;
    setMesgul(true);
    setHata(null);
    try {
      await apiSayfaMetaYaz({ yol, baslik: baslik.trim(), aciklama: aciklama.trim(), not: not.trim() });
      bildir(`${yol}: başlık/açıklama kaydedildi; sayfada birkaç saniye içinde.`);
      setSayfa(0);
      await listeYukle(q, 0);
    } catch (e) {
      setHata(hataMetni(e, "Kaydedilemedi."));
    } finally {
      setMesgul(false);
    }
  }

  async function sil(id: number, y: string) {
    if (!window.confirm(`${y} için elle yazılan başlık/açıklama kaldırılsın mı? Sitenin kendi değeri geri gelir.`)) return;
    try {
      await apiSayfaMetaSil(id);
      bildir(`${y}: sitenin kendi başlığına döndü.`);
      if (yol === y) {
        setBaslik("");
        setAciklama("");
        setNot("");
      }
      await listeYukle(q, sayfa);
    } catch (e) {
      setListeHata(hataMetni(e, "Kaldırılamadı."));
    }
  }

  const bu = uzunluk(baslik, BASLIK_ARALIGI);
  const au = uzunluk(aciklama, ACIKLAMA_ARALIGI);
  const onizBaslik = baslik.trim() || simdiki?.baslik || "";
  const onizAciklama = aciklama.trim() || simdiki?.aciklama || "";
  const bosKayit = !baslik.trim() && !aciklama.trim();

  return (
    <div className="stack">
      <div className="card">
        <div className="card-header">
          <div className="card-title">Sayfa başlığı ve açıklaması</div>
        </div>
        <div className="card-pad">
          <div className="hint" style={{ marginBottom: 12 }}>
            Bir sayfanın arama sonucunda ve paylaşımda görünen başlığını ve açıklamasını değiştirir.
            Önce adresi yazıp <b>Sayfadan getir</b>&apos;e basın: sayfanın şu anki başlığı ve açıklaması
            görünür. Boş bıraktığınız alanda sitenin kendi değeri kullanılır. Başlık olduğu gibi
            kullanılır; marka adını (örnek: &quot;| TELE SKOR&quot;) isterseniz kendiniz yazın. Kayıt sayfanın
            yalnız o adresine uygulanır (alt sekmeler ayrı sayfadır) ve birkaç saniyede yayına girer.
          </div>
          <div className="sh-form">
            <div className="field" style={{ margin: 0, gridColumn: "span 2" }}>
              <label className="label">Sayfa adresi</label>
              <input
                className="input"
                value={adres}
                placeholder="https://www.teleskor.com.tr/futbol/lig/..."
                onChange={(e) => setAdres(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void getir(adres);
                }}
              />
            </div>
            <div className="sh-form-dugme">
              <button className="btn" disabled={mesgul || !adres.trim()} onClick={() => void getir(adres)}>
                {mesgul && !yol ? "Okunuyor…" : "Sayfadan getir"}
              </button>
            </div>
          </div>
          {hata && (
            <div className="alert alert-error" style={{ marginTop: 10 }}>
              {hata}
            </div>
          )}
          {bilgi && (
            <div className="alert alert-warning" style={{ marginTop: 10 }}>
              {bilgi}
            </div>
          )}

          {yol && simdiki && (
            <div style={{ marginTop: 14 }}>
              <div className="cell-sub" style={{ marginBottom: 10 }}>
                Kayıt yolu: <code>{yol}</code>{" "}
                <a className="sh-ac" href={`${SITE}${yol}`} target="_blank" rel="noreferrer">
                  <ExternalLink size={12} /> sayfayı aç
                </a>
              </div>
              <div className="field">
                <label className="label">Başlık</label>
                <input
                  className="input"
                  value={baslik}
                  maxLength={BASLIK_EN_COK}
                  placeholder={simdiki.baslik ?? "Sitenin başlığı"}
                  onChange={(e) => setBaslik(e.target.value)}
                />
                <div className={bu.uyari ? "field-error" : "cell-sub"}>{bu.metin}</div>
                <div className="cell-sub">Şu an sayfada: {simdiki.baslik ?? "—"}</div>
              </div>
              <div className="field">
                <label className="label">Açıklama</label>
                <textarea
                  className="input"
                  rows={3}
                  value={aciklama}
                  maxLength={ACIKLAMA_EN_COK}
                  placeholder={simdiki.aciklama ?? "Sitenin açıklaması"}
                  onChange={(e) => setAciklama(e.target.value)}
                />
                <div className={au.uyari ? "field-error" : "cell-sub"}>{au.metin}</div>
                <div className="cell-sub">Şu an sayfada: {simdiki.aciklama ?? "—"}</div>
              </div>
              <div className="field">
                <label className="label">Not (isteğe bağlı)</label>
                <input
                  className="input"
                  value={not}
                  maxLength={300}
                  placeholder="Neden değiştirildi"
                  onChange={(e) => setNot(e.target.value)}
                />
              </div>

              <div className="label" style={{ marginBottom: 6 }}>
                Arama sonucu önizlemesi
              </div>
              <div className="sh-serp">
                <div className="sh-serp-adres">{`www.teleskor.com.tr${yol === "/" ? "" : yol.replace(/\//g, " › ")}`}</div>
                <div className="sh-serp-baslik">{onizBaslik || "—"}</div>
                <div className="sh-serp-aciklama">{onizAciklama || "—"}</div>
              </div>

              <div className="sh-dugmeler" style={{ marginTop: 12 }}>
                <button className="btn btn-primary" disabled={mesgul || bosKayit} onClick={() => void kaydet()}>
                  {mesgul ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>
              {bosKayit && (
                <div className="cell-sub">
                  İkisi de boşsa kaydedilecek bir şey yok; elle yazılmış kaydı kaldırmak için aşağıdaki listeyi kullanın.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Elle başlık verilen sayfalar ({liste?.toplam ?? 0})</div>
        </div>
        <div className="card-pad">
          <div className="sh-form">
            <div className="field" style={{ margin: 0, gridColumn: "span 2" }}>
              <label className="label">Ara (adres ya da başlık)</label>
              <input
                className="input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSayfa(0);
                    void listeYukle(q, 0);
                  }
                }}
              />
            </div>
            <div className="sh-form-dugme">
              <button
                className="btn"
                onClick={() => {
                  setSayfa(0);
                  void listeYukle(q, 0);
                }}
              >
                Ara
              </button>
            </div>
          </div>
          {listeHata && (
            <div className="alert alert-error" style={{ marginTop: 10 }}>
              {listeHata}
            </div>
          )}
          {liste && liste.kayitlar.length === 0 && (
            <div className="muted" style={{ fontSize: 13, marginTop: 14 }}>
              {q ? "Aramaya uyan kayıt yok." : "Henüz elle başlık verilen sayfa yok."}
            </div>
          )}
          {liste && liste.kayitlar.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 14 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sayfa</th>
                    <th>Başlık</th>
                    <th>Açıklama</th>
                    <th>Son değişiklik</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {liste.kayitlar.map((k) => (
                    <tr key={k.id}>
                      <td className="sh-yol">
                        <a href={`${SITE}${k.yol}`} target="_blank" rel="noreferrer">
                          {k.yol}
                        </a>
                        {k.not && <div className="cell-sub">{k.not}</div>}
                      </td>
                      <td>{k.baslik ?? <span className="muted">sitenin</span>}</td>
                      <td className="sh-kisa">{k.aciklama ?? <span className="muted">sitenin</span>}</td>
                      <td className="cell-sub">
                        {k.guncelleyen ?? "—"}
                        <br />
                        {tarih(k.guncellendi)}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button
                          className="btn btn-sm btn-ghost"
                          title="Düzenle"
                          aria-label="Düzenle"
                          onClick={() => {
                            setAdres(k.yol);
                            void getir(k.yol, k);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          title="Kaldır"
                          aria-label="Kaldır"
                          onClick={() => void sil(k.id, k.yol)}
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
          <div className="sh-dugmeler" style={{ marginTop: 12 }}>
            <button className="btn btn-sm" disabled={sayfa === 0} onClick={() => setSayfa((s) => s - 1)}>
              Daha yeni
            </button>
            <button className="btn btn-sm" disabled={!liste?.dahaVar} onClick={() => setSayfa((s) => s + 1)}>
              Daha eski
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
