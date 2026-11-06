"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiTeleskorWidgetSiteleri,
  apiTeleskorWidgetSitesiEkle,
  apiTeleskorWidgetSitesiGuncelle,
  apiTeleskorWidgetAnahtarYenile,
  apiTeleskorWidgetKullanim,
  ApiError,
} from "@/lib/api-client";
import type { WidgetKullanimi, WidgetSitesi, WidgetSitesiSatiri } from "@/lib/types";

/** Teleskor `WidgetSiteleri.TURLER` ile aynı sıra ve kod (web `turler.ts`). */
const TURLER: { kod: string; ad: string }[] = [
  { kod: "puan-durumu", ad: "Puan durumu" },
  { kod: "fikstur", ad: "Takım fikstürü" },
  { kod: "kadro", ad: "Kadro" },
  { kod: "gunun-maclari", ad: "Günün maçları" },
  { kod: "tv-rehberi", ad: "TV rehberi" },
  { kod: "mac", ad: "Maç kartı" },
  { kod: "mac-onu", ad: "Maç önü" },
  { kod: "gol-kralligi", ad: "Gol krallığı" },
  { kod: "oyuncu", ad: "Oyuncu kartı" },
];
const TUR_ADI = Object.fromEntries(TURLER.map((t) => [t.kod, t.ad]));
const SITE = "https://www.teleskor.com.tr";

type Form = {
  id: number | null;
  ad: string;
  alanlar: string;
  kendi: boolean;
  acik: boolean;
  hepsi: boolean;
  turler: string[];
  not: string;
};

const BOS: Form = { id: null, ad: "", alanlar: "", kendi: false, acik: true, hepsi: true, turler: [], not: "" };

function formdan(s: WidgetSitesi): Form {
  const turler = s.turler ?? [];
  return {
    id: s.id,
    ad: s.ad,
    alanlar: s.alanlar.join("\n"),
    kendi: s.kendi,
    acik: s.acik,
    hepsi: turler.length === 0,
    turler,
    not: s.not ?? "",
  };
}

function hataMetni(e: unknown): string {
  return e instanceof ApiError ? e.message : "Beklenmeyen bir hata oluştu.";
}

const sayi = (n: number) => n.toLocaleString("tr-TR");

function tarih(s: string): string {
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? s
    : d.toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function gomeKodu(s: WidgetSitesi): string {
  return `<div class="teleskor-widget" data-tur="puan-durumu" data-lig="310" data-anahtar="${s.anahtar}"></div>\n<script async src="${SITE}/w/yukle.js"></script>`;
}

async function kopyala(metin: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(metin);
    return true;
  } catch {
    return false;
  }
}

export default function TeleskorWidgetSiteleriClient() {
  const [satirlar, setSatirlar] = useState<WidgetSitesiSatiri[] | null>(null);
  const [kullanim, setKullanim] = useState<WidgetKullanimi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [formHata, setFormHata] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [acikSite, setAcikSite] = useState<number | null>(null);

  const yukle = useCallback(async () => {
    try {
      const [l, k] = await Promise.all([apiTeleskorWidgetSiteleri(), apiTeleskorWidgetKullanim(30)]);
      setSatirlar(l);
      setKullanim(k);
      setHata(null);
    } catch (e) {
      setHata(hataMetni(e));
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void yukle(), 0);
    return () => clearTimeout(t);
  }, [yukle]);

  function duyur(m: string) {
    setBilgi(m);
    setTimeout(() => setBilgi(null), 3000);
  }

  async function kaydet() {
    if (!form) return;
    const istek = {
      ad: form.ad.trim(),
      alanlar: form.alanlar
        .split(/[\s,]+/)
        .map((a) => a.trim())
        .filter(Boolean),
      kendi: form.kendi,
      acik: form.acik,
      turler: form.hepsi ? [] : form.turler,
      not: form.not.trim(),
    };
    if (!istek.ad) return setFormHata("Site adı gerekli.");
    if (!form.hepsi && istek.turler.length === 0) return setFormHata("En az bir widget türü seçin ya da hepsine izin verin.");
    setMesgul(true);
    setFormHata(null);
    try {
      if (form.id == null) await apiTeleskorWidgetSitesiEkle(istek);
      else await apiTeleskorWidgetSitesiGuncelle(form.id, istek);
      setForm(null);
      duyur(form.id == null ? "Site eklendi." : "Site güncellendi.");
      await yukle();
    } catch (e) {
      setFormHata(hataMetni(e));
    } finally {
      setMesgul(false);
    }
  }

  async function acikDegistir(s: WidgetSitesi) {
    setMesgul(true);
    try {
      await apiTeleskorWidgetSitesiGuncelle(s.id, {
        ad: s.ad,
        alanlar: s.alanlar,
        kendi: s.kendi,
        acik: !s.acik,
        turler: s.turler ?? [],
        not: s.not ?? "",
      });
      duyur(s.acik ? `${s.ad} kapatıldı. Widget'lar en geç birkaç dakikada durur.` : `${s.ad} açıldı.`);
      await yukle();
    } catch (e) {
      setHata(hataMetni(e));
    } finally {
      setMesgul(false);
    }
  }

  async function anahtarYenile(s: WidgetSitesi) {
    if (!window.confirm(`${s.ad} için yeni anahtar üretilsin mi? Eski anahtarla gömülen widget'lar çalışmayı bırakır; siteye yeni kodu vermeniz gerekir.`)) return;
    setMesgul(true);
    try {
      await apiTeleskorWidgetAnahtarYenile(s.id);
      duyur("Yeni anahtar üretildi.");
      await yukle();
    } catch (e) {
      setHata(hataMetni(e));
    } finally {
      setMesgul(false);
    }
  }

  /** Site başına, tür başına son 30 günün toplamı. */
  const turToplamlari = useMemo(() => {
    const m = new Map<number, Map<string, number>>();
    for (const g of kullanim?.gunler ?? []) {
      const t = m.get(g.siteId) ?? new Map<string, number>();
      t.set(g.tur, (t.get(g.tur) ?? 0) + g.sayi);
      m.set(g.siteId, t);
    }
    return m;
  }, [kullanim]);

  /** Seçili sitenin gün gün sayıları (en yeni önce). */
  const gunluk = useMemo(() => {
    if (acikSite == null) return [];
    const m = new Map<string, number>();
    for (const g of kullanim?.gunler ?? []) if (g.siteId === acikSite) m.set(g.gun, (m.get(g.gun) ?? 0) + g.sayi);
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [kullanim, acikSite]);

  const anahtarsizToplam = useMemo(() => {
    const t = kullanim?.siteToplamlari?.["0"];
    return t ? { son30: t[0], bugun: t[1] } : null;
  }, [kullanim]);

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Widget Siteleri</h1>
          <div className="muted">
            Haber sitelerine verilen widget&apos;lar. Her site kendi anahtarıyla gömer; widget yalnız sitenin
            alan adlarında açılır. Anahtarsız gömmeye izin Uygulama Ayarları → Özellikler → &quot;Anahtarsız widget gömme&quot; ile kapatılabilir.
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ ...BOS }); setFormHata(null); }} disabled={mesgul}>
          Site ekle
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}
      {bilgi && <div className="alert alert-success">{bilgi}</div>}

      {form && (
        <div className="card card-pad">
          <div className="card-title">{form.id == null ? "Yeni site" : "Siteyi düzenle"}</div>
          <div className="stack">
            <div className="field">
              <label className="label">Site adı</label>
              <input className="input" value={form.ad} maxLength={100} onChange={(e) => setForm({ ...form, ad: e.target.value })} placeholder="Örnek Haber" />
            </div>
            <div className="field">
              <label className="label">Alan adları</label>
              <textarea
                className="input"
                rows={3}
                value={form.alanlar}
                onChange={(e) => setForm({ ...form, alanlar: e.target.value })}
                placeholder={"ornekhaber.com\nmobil.ornekhaber.com"}
              />
              <div className="hint">Her satıra bir alan adı (en çok 10). Alt alan adları da kapsanır; &quot;www.&quot; yazmanıza gerek yok.</div>
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={form.kendi} onChange={(e) => setForm({ ...form, kendi: e.target.checked })} />
              Kendi sitemiz (gömme kodunda <code>data-marka=&quot;0&quot;</code> ile TELE SKOR bağlantısı gizlenebilir)
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={form.acik} onChange={(e) => setForm({ ...form, acik: e.target.checked })} />
              Açık (kapalı sitede widget&apos;lar &quot;kullanıma kapalı&quot; yazar)
            </label>
            <div className="field">
              <label className="label">İzinli widget türleri</label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={form.hepsi} onChange={(e) => setForm({ ...form, hepsi: e.target.checked })} />
                Hepsi (ileride eklenenler dâhil)
              </label>
              {!form.hepsi && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 6 }}>
                  {TURLER.map((t) => (
                    <label key={t.kod} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={form.turler.includes(t.kod)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            turler: e.target.checked ? [...form.turler, t.kod] : form.turler.filter((x) => x !== t.kod),
                          })
                        }
                      />
                      {t.ad}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="field">
              <label className="label">Not (yalnız panelde görünür)</label>
              <input className="input" value={form.not} maxLength={500} onChange={(e) => setForm({ ...form, not: e.target.value })} placeholder="İletişim kişisi, anlaşma tarihi..." />
            </div>
            {formHata && <div className="alert alert-error">{formHata}</div>}
            <div className="form-actions">
              <button className="btn btn-primary" onClick={() => void kaydet()} disabled={mesgul}>
                {mesgul ? "Kaydediliyor..." : "Kaydet"}
              </button>
              <button className="btn btn-ghost" onClick={() => setForm(null)} disabled={mesgul}>
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-pad">
          <div className="card-title">Siteler</div>
        </div>
        {satirlar == null ? (
          <div className="card-pad muted">Yükleniyor...</div>
        ) : satirlar.length === 0 ? (
          <div className="card-pad muted">Henüz site yok. &quot;Site ekle&quot; ile ilk siteyi tanımlayın.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Alan adları</th>
                  <th>Türler</th>
                  <th style={{ textAlign: "right" }}>Bugün</th>
                  <th style={{ textAlign: "right" }}>30 gün</th>
                  <th>Açık</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {satirlar.map(({ site: s, son30, bugun }) => {
                  const turSayilari = turToplamlari.get(s.id);
                  return (
                    <tr key={s.id} className={s.acik ? "" : "row-muted"}>
                      <td>
                        <b>{s.ad}</b> {s.kendi && <span className="badge badge-published">Kendi</span>}
                        <div className="cell-sub" style={{ fontFamily: "monospace" }}>{s.anahtar}</div>
                        {s.not && <div className="cell-sub">{s.not}</div>}
                        <div className="cell-sub">
                          Son değişiklik {tarih(s.guncellendi)}
                          {s.guncelleyen ? ` · ${s.guncelleyen}` : ""}
                        </div>
                      </td>
                      <td>{s.alanlar.length ? s.alanlar.join(", ") : <span className="muted">-</span>}</td>
                      <td>
                        {s.turler && s.turler.length ? s.turler.map((t) => TUR_ADI[t] ?? t).join(", ") : "Hepsi"}
                        {turSayilari && turSayilari.size > 0 && (
                          <div className="cell-sub">
                            {[...turSayilari.entries()]
                              .sort((a, b) => b[1] - a[1])
                              .map(([t, n]) => `${TUR_ADI[t] ?? t} ${sayi(n)}`)
                              .join(" · ")}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>{sayi(bugun)}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => setAcikSite(acikSite === s.id ? null : s.id)} title="Gün gün">
                          {sayi(son30)}
                        </button>
                      </td>
                      <td>
                        <label className="switch" title={s.acik ? "Açık" : "Kapalı"}>
                          <input type="checkbox" checked={s.acik} disabled={mesgul} aria-label={`${s.ad} açık`} onChange={() => void acikDegistir(s)} />
                          <span className="slider" />
                        </label>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="btn btn-sm" onClick={async () => duyur((await kopyala(s.anahtar)) ? "Anahtar kopyalandı." : "Kopyalanamadı.")}>
                          Anahtarı kopyala
                        </button>{" "}
                        <button className="btn btn-sm" onClick={async () => duyur((await kopyala(gomeKodu(s))) ? "Örnek gömme kodu kopyalandı." : "Kopyalanamadı.")}>
                          Örnek kod
                        </button>{" "}
                        <button className="btn btn-sm" onClick={() => { setForm(formdan(s)); setFormHata(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                          Düzenle
                        </button>{" "}
                        <button className="btn btn-sm btn-danger" onClick={() => void anahtarYenile(s)} disabled={mesgul}>
                          Anahtarı yenile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="card-pad hint">
          Gömme kodunu <a href={`${SITE}/widget`} target="_blank" rel="noopener noreferrer">teleskor.com.tr/widget</a>{" "}sayfasında
          üretip &quot;Site anahtarı&quot; kutusuna bu anahtarı yazın. Sayılar dakikada bir işlenir.
        </div>
      </div>

      {acikSite != null && (
        <div className="card">
          <div className="card-pad spread">
            <div className="card-title">{satirlar?.find((r) => r.site.id === acikSite)?.site.ad} · gün gün</div>
            <button className="btn btn-sm btn-ghost" onClick={() => setAcikSite(null)}>Kapat</button>
          </div>
          {gunluk.length === 0 ? (
            <div className="card-pad muted">Son 30 günde görüntülenme yok.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Gün</th>
                    <th style={{ textAlign: "right" }}>Görüntülenme</th>
                  </tr>
                </thead>
                <tbody>
                  {gunluk.map(([g, n]) => (
                    <tr key={g}>
                      <td>{g}</td>
                      <td style={{ textAlign: "right" }}>{sayi(n)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-pad">
          <div className="card-title">Anahtarsız gömenler (son 30 gün)</div>
          <div className="muted">
            Kayıtlı olmadan widget gömen alan adları
            {anahtarsizToplam ? ` · bugün ${sayi(anahtarsizToplam.bugun)}, 30 günde ${sayi(anahtarsizToplam.son30)} görüntülenme` : ""}.
            Tanıdığınız bir siteyse ekleyip anahtar verebilirsiniz.
          </div>
        </div>
        {(kullanim?.anahtarsizAlanlar ?? []).length === 0 ? (
          <div className="card-pad muted">Kayıt yok.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alan adı</th>
                  <th style={{ textAlign: "right" }}>Görüntülenme</th>
                  <th>Son görülme</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {kullanim!.anahtarsizAlanlar.map((a) => (
                  <tr key={a.alan}>
                    <td>{a.alan || <span className="muted">(bilinmiyor)</span>}</td>
                    <td style={{ textAlign: "right" }}>{sayi(a.sayi)}</td>
                    <td>{a.sonGun}</td>
                    <td>
                      {a.alan && (
                        <button
                          className="btn btn-sm"
                          onClick={() => { setForm({ ...BOS, ad: a.alan, alanlar: a.alan }); setFormHata(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        >
                          Site olarak ekle
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
