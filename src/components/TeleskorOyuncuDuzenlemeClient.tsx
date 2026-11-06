"use client";

import { useEffect, useRef, useState } from "react";
import {
  apiKadroOyuncuAra,
  apiKadroTakimAra,
  apiOyuncuOdulAra,
  apiOyuncuOdulKaldir,
  apiOyuncuOduller,
  apiOyuncuOdulYaz,
  apiOyuncuTransferKaldir,
  apiOyuncuTransferler,
  apiOyuncuTransferTurleri,
  apiOyuncuTransferYaz,
  apiOyuncuSakatlikKaldir,
  apiOyuncuSakatliklar,
  apiOyuncuSakatlikSebepAra,
  apiOyuncuSakatlikTurleri,
  apiOyuncuSakatlikYaz,
  apiOyuncuLigAra,
  apiOyuncuLigSezonlari,
  apiOyuncuSezonKaldir,
  apiOyuncuSezonKalemleri,
  apiOyuncuSezonlar,
  apiOyuncuSezonYaz,
  apiOyuncuBiyografi,
  apiOyuncuBiyografiKaldir,
  apiOyuncuBiyografiYaz,
  ApiError,
} from "@/lib/api-client";
import type {
  KadroOyuncuBulgusu,
  KadroTakimBulgusu,
  OyuncuDuzeltmeIz,
  OyuncuDuzeltmeOyuncu,
  OyuncuDuzeltmeTakim,
  OyuncuOdul,
  OyuncuOdulAnahtari,
  OyuncuOdulDurumu,
  OyuncuSaglayiciOdul,
  OyuncuSaglayiciTransfer,
  OyuncuTransferAnahtari,
  OyuncuTransferDurumu,
  OyuncuTransferTuru,
  OyuncuSaglayiciSakatlik,
  OyuncuSakatlikAnahtari,
  OyuncuSakatlikDurumu,
  OyuncuSakatlikSebebi,
  OyuncuSakatlikTuru,
  OyuncuDuzeltmeLig,
  OyuncuLigSezonu,
  OyuncuSaglayiciSezon,
  OyuncuSezonDurumu,
  OyuncuSezonKalemi,
  OyuncuBiyografiDurumu,
} from "@/lib/types";

/**
 * OYUNCU PROFİLİ (motor V119-V122) — oyuncu sayfasının eksiklerini tamamlama.
 *
 * <p>Beş bölüm: Genel Bakış (metin, V122), Başarılar, Transferler, Sakatlıklar ve İstatistikler (sezon satırları). Her bölümde kaynağın
 * satırları ve elle girilenler yan yana. Kaynağın yanlış satırı gizlenir ya
 * da "Düzelt" ile aynı anda gizlenip doğrusu eklenir. Elle satırlar oyuncu
 * sayfasında (uygulama ve web) hemen görünür; sonraki senkron silmez.
 *
 * <p>Künye alanları (doğum, boy, mevki, fotoğraf) Veri Düzeltme sayfasında.
 */

const GEREKCE_EN_COK = 300;

function tarih(s?: string): string {
  if (!s) return "—";
  const d = new Date(s.length === 10 ? `${s}T12:00:00Z` : s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

function hataMetni(e: unknown, yedek: string): string {
  return e instanceof ApiError ? e.message : yedek;
}

function IzSatiri({ iz }: { iz: OyuncuDuzeltmeIz }) {
  return (
    <div className="cell-sub">
      {iz.olusturan ?? "—"}, {tarihSaat(iz.olusturuldu)}
      {iz.gerekce ? ` · ${iz.gerekce}` : ""}
    </div>
  );
}

function Rozet({ children, tur }: { children: React.ReactNode; tur: "elle" | "gizli" | "kaynak" }) {
  const renk =
    tur === "elle"
      ? { background: "var(--accent-soft, #e8f0ff)", color: "var(--accent, #2457d6)" }
      : tur === "gizli"
        ? { background: "#fdecec", color: "#b42318" }
        : { background: "#eef7ee", color: "#2e7d32" };
  return (
    <span
      style={{
        ...renk,
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: 6,
        marginLeft: 6,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Takım seçici (ürünün katalog araması) — transferde katalogda olmayan kulüp
// için serbest ad da yazılabilir.
// ---------------------------------------------------------------------------

type TakimSecimi = { id: number | null; ad: string };

function TakimSecici({
  etiket,
  deger,
  degisti,
  serbestAd,
}: {
  etiket: string;
  deger: TakimSecimi | null;
  degisti: (t: TakimSecimi | null) => void;
  serbestAd?: boolean;
}) {
  const [q, setQ] = useState("");
  const [sonuc, setSonuc] = useState<KadroTakimBulgusu[]>([]);
  const [araniyor, setAraniyor] = useState(false);

  useEffect(() => {
    if (deger || q.trim().length < 2) {
      setSonuc([]);
      return;
    }
    let iptal = false;
    const t = setTimeout(async () => {
      setAraniyor(true);
      try {
        const r = await apiKadroTakimAra(q);
        if (!iptal) setSonuc(r);
      } catch {
        if (!iptal) setSonuc([]);
      } finally {
        if (!iptal) setAraniyor(false);
      }
    }, 300);
    return () => {
      iptal = true;
      clearTimeout(t);
    };
  }, [q, deger]);

  return (
    <label style={{ display: "block" }}>
      <div className="label">{etiket}</div>
      {deger ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>
            <b>{deger.ad}</b>{" "}
            <span className="muted">{deger.id ? `#${deger.id}` : "(katalogda yok, yalnız ad)"}</span>
          </span>
          <button type="button" className="btn btn-sm" onClick={() => degisti(null)}>
            Değiştir
          </button>
        </div>
      ) : (
        <>
          <input
            className="input"
            placeholder="Kulüp adı yaz"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {araniyor && <div className="cell-sub">Aranıyor…</div>}
          {sonuc.length > 0 && (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 8,
                marginTop: 4,
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              {sonuc.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  className="btn btn-sm"
                  style={{ display: "block", width: "100%", textAlign: "left", border: 0 }}
                  onClick={() => {
                    degisti({ id: t.id, ad: t.ad ?? t.adEn ?? `#${t.id}` });
                    setQ("");
                  }}
                >
                  {t.ad ?? t.adEn} <span className="muted">{t.ulke ? `· ${t.ulke}` : ""} #{t.id}</span>
                </button>
              ))}
            </div>
          )}
          {serbestAd && q.trim().length >= 2 && (
            <button
              type="button"
              className="btn btn-sm"
              style={{ marginTop: 4 }}
              onClick={() => degisti({ id: null, ad: q.trim() })}
            >
              Listede yok: &quot;{q.trim()}&quot; adıyla yaz
            </button>
          )}
        </>
      )}
    </label>
  );
}

function takimdan(t?: OyuncuDuzeltmeTakim, ad?: string): TakimSecimi | null {
  if (t) return { id: t.id, ad: t.ad ?? `#${t.id}` };
  if (ad) return { id: null, ad };
  return null;
}

function GerekceAlani({ deger, degisti }: { deger: string; degisti: (s: string) => void }) {
  return (
    <label style={{ display: "block" }}>
      <div className="label">Gerekçe (zorunlu: bilgi nereden?)</div>
      <input
        className="input"
        maxLength={GEREKCE_EN_COK}
        placeholder="ör. TFF arşivi, kulübün resmi sitesi"
        value={deger}
        onChange={(e) => degisti(e.target.value)}
      />
    </label>
  );
}

// ---------------------------------------------------------------------------
// Başarılar
// ---------------------------------------------------------------------------

function Basarilar({ oyuncuId, bildir }: { oyuncuId: number; bildir: (m: string) => void }) {
  const [durum, setDurum] = useState<OyuncuOdulDurumu | null>(null);
  const [hata, setHata] = useState("");
  const [form, setForm] = useState<{ yerine: OyuncuOdulAnahtari | null } | null>(null);
  const [odul, setOdul] = useState<OyuncuOdul | null>(null);
  const [yeniOdulAdi, setYeniOdulAdi] = useState("");
  const [odulQ, setOdulQ] = useState("");
  const [odulSonuc, setOdulSonuc] = useState<OyuncuOdul[]>([]);
  const [sezon, setSezon] = useState("");
  const [kulup, setKulup] = useState<TakimSecimi | null>(null);
  const [gerekce, setGerekce] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useEffect(() => {
    setDurum(null);
    setForm(null);
    apiOyuncuOduller(oyuncuId)
      .then(setDurum)
      .catch((e) => setHata(hataMetni(e, "Başarılar alınamadı.")));
  }, [oyuncuId]);

  useEffect(() => {
    if (odul || odulQ.trim().length < 2) {
      setOdulSonuc([]);
      return;
    }
    let iptal = false;
    const t = setTimeout(() => {
      apiOyuncuOdulAra(odulQ)
        .then((r) => !iptal && setOdulSonuc(r))
        .catch(() => !iptal && setOdulSonuc([]));
    }, 300);
    return () => {
      iptal = true;
      clearTimeout(t);
    };
  }, [odulQ, odul]);

  function formuAc(kaynak?: OyuncuSaglayiciOdul) {
    setHata("");
    setForm({
      yerine: kaynak
        ? { honorId: kaynak.odul.id, sezon: kaynak.sezon ?? null, takimId: kaynak.takim?.id ?? null }
        : null,
    });
    setOdul(kaynak ? kaynak.odul : null);
    setYeniOdulAdi("");
    setOdulQ("");
    setSezon(kaynak?.sezon ?? "");
    setKulup(takimdan(kaynak?.takim));
    setGerekce("");
  }

  async function kaydet() {
    if (!odul && yeniOdulAdi.trim().length < 3) {
      setHata("Ödülü listeden seç ya da yeni ödülün adını yaz.");
      return;
    }
    if (gerekce.trim().length < 3) {
      setHata("Gerekçe zorunlu.");
      return;
    }
    setGonderiliyor(true);
    setHata("");
    try {
      const d = await apiOyuncuOdulYaz(oyuncuId, {
        islem: "EKLE",
        honorId: odul?.id ?? null,
        yeniOdulAdi: odul ? null : yeniOdulAdi.trim(),
        sezon: sezon.trim() || null,
        takimId: kulup?.id ?? null,
        yerine: form?.yerine ?? null,
        gerekce: gerekce.trim(),
      });
      setDurum(d);
      setForm(null);
      bildir(form?.yerine ? "Başarı düzeltildi." : "Başarı eklendi.");
    } catch (e) {
      setHata(hataMetni(e, "Kaydedilemedi."));
    } finally {
      setGonderiliyor(false);
    }
  }

  async function gizle(s: OyuncuSaglayiciOdul) {
    const g = window.prompt(
      `"${s.odul.ad}" (${s.sezon ?? "sezonsuz"}) oyuncu sayfasından gizlensin. Gerekçe?`,
    );
    if (!g || g.trim().length < 3) return;
    setHata("");
    try {
      setDurum(
        await apiOyuncuOdulYaz(oyuncuId, {
          islem: "GIZLE",
          yerine: { honorId: s.odul.id, sezon: s.sezon ?? null, takimId: s.takim?.id ?? null },
          gerekce: g.trim(),
        }),
      );
      bildir("Satır gizlendi.");
    } catch (e) {
      setHata(hataMetni(e, "Gizlenemedi."));
    }
  }

  async function geriAl(id: number, soru: string) {
    if (!window.confirm(soru)) return;
    setHata("");
    try {
      setDurum(await apiOyuncuOdulKaldir(id));
      bildir("Geri alındı.");
    } catch (e) {
      setHata(hataMetni(e, "Geri alınamadı."));
    }
  }

  if (!durum) {
    return hata ? <div className="alert alert-error">{hata}</div> : <p className="muted">Yükleniyor…</p>;
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {hata && <div className="alert alert-error">{hata}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="card-title">Kaynaktan gelenler ({durum.saglayici.length})</div>
        {!form && (
          <button className="btn btn-primary btn-sm" onClick={() => formuAc()}>
            Başarı ekle
          </button>
        )}
      </div>

      {form && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, display: "grid", gap: 10 }}>
          <div className="cell-title">
            {form.yerine ? "Kaynağın satırını düzelt (eski satır gizlenir)" : "Yeni başarı"}
          </div>
          <label style={{ display: "block" }}>
            <div className="label">Ödül</div>
            {odul ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <b>{odul.ad}</b>
                {odul.adEn && odul.adEn !== odul.ad && <span className="muted">({odul.adEn})</span>}
                <button type="button" className="btn btn-sm" onClick={() => setOdul(null)}>
                  Değiştir
                </button>
              </div>
            ) : (
              <>
                <input
                  className="input"
                  placeholder="ör. Turkish champion, Süper Lig"
                  value={odulQ}
                  onChange={(e) => {
                    setOdulQ(e.target.value);
                    setYeniOdulAdi("");
                  }}
                />
                {odulSonuc.length > 0 && (
                  <div style={{ border: "1px solid var(--border)", borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: "auto" }}>
                    {odulSonuc.map((o) => (
                      <button
                        type="button"
                        key={o.id}
                        className="btn btn-sm"
                        style={{ display: "block", width: "100%", textAlign: "left", border: 0 }}
                        onClick={() => setOdul(o)}
                      >
                        {o.ad} {o.adEn && o.adEn !== o.ad && <span className="muted">({o.adEn})</span>}
                        {o.elle && <Rozet tur="elle">elle açıldı</Rozet>}
                      </button>
                    ))}
                  </div>
                )}
                {odulQ.trim().length >= 3 && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ marginTop: 4 }}
                    onClick={() => setYeniOdulAdi(odulQ.trim())}
                  >
                    Listede yok: &quot;{odulQ.trim()}&quot; adıyla yeni ödül aç
                  </button>
                )}
                {yeniOdulAdi && (
                  <div className="cell-sub" style={{ marginTop: 4 }}>
                    Yeni ödül açılacak: <b>{yeniOdulAdi}</b>. Mümkünse listedeki ödülü seçin; aynı kupa
                    iki adla açılırsa kupa dolabında iki ayrı satır çıkar.
                  </div>
                )}
              </>
            )}
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <label>
              <div className="label">Sezon</div>
              <input className="input" placeholder="ör. 1994-1995 ya da 2003" maxLength={40} value={sezon} onChange={(e) => setSezon(e.target.value)} />
            </label>
            <TakimSecici etiket="Kulüp (kazandığı takım)" deger={kulup} degisti={(t) => setKulup(t && t.id ? t : null)} />
          </div>
          <GerekceAlani deger={gerekce} degisti={setGerekce} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={gonderiliyor} onClick={kaydet}>
              {gonderiliyor ? "Kaydediliyor…" : "Kaydet"}
            </button>
            <button className="btn btn-sm" onClick={() => setForm(null)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {durum.saglayici.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>Kaynakta bu oyuncunun başarısı yok.</p>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {durum.saglayici.map((s, i) => (
            <div
              key={`${s.odul.id}-${s.sezon}-${s.takim?.id}-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
                opacity: s.gizlemeId ? 0.55 : 1,
              }}
            >
              <span>
                <b>{s.odul.ad}</b> <span className="muted">· {s.sezon ?? "sezon yok"} · {s.takim?.ad ?? "kulüp yok"}</span>
                {s.gizlemeId ? <Rozet tur="gizli">gizli</Rozet> : null}
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                {s.gizlemeId ? (
                  <button className="btn btn-sm" onClick={() => geriAl(s.gizlemeId!, "Gizleme kaldırılsın, satır yeniden görünsün mü? (Yerine girilen düzeltme varsa o da kalkar.)")}>
                    Gizlemeyi geri al
                  </button>
                ) : (
                  <>
                    <button className="btn btn-sm" onClick={() => formuAc(s)}>Düzelt</button>
                    <button className="btn btn-sm" onClick={() => gizle(s)}>Gizle</button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card-title">Elle girilenler ({durum.elle.length})</div>
      {durum.elle.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>Henüz elle girilen başarı yok.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {durum.elle.map((e) => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div>
                <b>{e.odul.ad}</b> <span className="muted">· {e.sezon ?? "sezon yok"} · {e.takim?.ad ?? "kulüp yok"}</span>
                <Rozet tur="elle">{e.yerineId ? "düzeltme" : "elle"}</Rozet>
                {e.kaynakVeriyor && <Rozet tur="kaynak">Kaynak da veriyor · kaldırabilirsin</Rozet>}
                <IzSatiri iz={e.iz} />
              </div>
              <button className="btn btn-sm" onClick={() => geriAl(e.id, `"${e.odul.ad}" kaydı kaldırılsın mı?${e.yerineId ? " Gizlenen kaynak satırı yeniden görünür." : ""}`)}>
                Kaldır
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transferler
// ---------------------------------------------------------------------------

/** Kaynağın saatli tarihinden YYYY-AA-GG (form ön dolumu için, UTC günü). */
function gunu(s?: string): string {
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function kulupAdi(t?: OyuncuDuzeltmeTakim, ad?: string): string {
  return t?.ad ?? ad ?? "?";
}

function Transferler({ oyuncuId, bildir }: { oyuncuId: number; bildir: (m: string) => void }) {
  const [durum, setDurum] = useState<OyuncuTransferDurumu | null>(null);
  const [turler, setTurler] = useState<OyuncuTransferTuru[]>([]);
  const [hata, setHata] = useState("");
  const [form, setForm] = useState<{ yerine: OyuncuTransferAnahtari | null } | null>(null);
  const [gun, setGun] = useState("");
  const [tur, setTur] = useState<string>("");
  const [cikilan, setCikilan] = useState<TakimSecimi | null>(null);
  const [gidilen, setGidilen] = useState<TakimSecimi | null>(null);
  const [bedel, setBedel] = useState("");
  const [bedelMetni, setBedelMetni] = useState("");
  const [gerekce, setGerekce] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useEffect(() => {
    setDurum(null);
    setForm(null);
    apiOyuncuTransferler(oyuncuId)
      .then(setDurum)
      .catch((e) => setHata(hataMetni(e, "Transferler alınamadı.")));
    apiOyuncuTransferTurleri(oyuncuId).then(setTurler).catch(() => setTurler([]));
  }, [oyuncuId]);

  function anahtar(s: OyuncuSaglayiciTransfer): OyuncuTransferAnahtari {
    return {
      cikilanId: s.cikilan?.id ?? null,
      gidilenId: s.gidilen?.id ?? null,
      cikilanAdi: s.cikilanAdi ?? null,
      gidilenAdi: s.gidilenAdi ?? null,
      tarih: s.tarih ?? null,
    };
  }

  function formuAc(kaynak?: OyuncuSaglayiciTransfer) {
    setHata("");
    setForm({ yerine: kaynak ? anahtar(kaynak) : null });
    setGun(gunu(kaynak?.tarih));
    setTur(kaynak?.tur != null ? String(kaynak.tur) : "");
    setCikilan(takimdan(kaynak?.cikilan, kaynak?.cikilanAdi));
    setGidilen(takimdan(kaynak?.gidilen, kaynak?.gidilenAdi));
    setBedel(kaynak?.bedel != null ? String(kaynak.bedel) : "");
    setBedelMetni(kaynak?.bedelMetni ?? "");
    setGerekce("");
  }

  async function kaydet() {
    if (!cikilan && !gidilen) {
      setHata("Çıkılan ya da gidilen kulüpten en az biri gerekli.");
      return;
    }
    if (bedel && !/^\d+$/.test(bedel.trim())) {
      setHata("Bedel yalnız rakam olmalı (birimi açıklamaya yazın).");
      return;
    }
    if (gerekce.trim().length < 3) {
      setHata("Gerekçe zorunlu.");
      return;
    }
    setGonderiliyor(true);
    setHata("");
    try {
      const d = await apiOyuncuTransferYaz(oyuncuId, {
        islem: "EKLE",
        tarih: gun || null,
        tur: tur ? Number(tur) : null,
        cikilanId: cikilan?.id ?? null,
        cikilanAdi: cikilan && !cikilan.id ? cikilan.ad : null,
        gidilenId: gidilen?.id ?? null,
        gidilenAdi: gidilen && !gidilen.id ? gidilen.ad : null,
        bedel: bedel.trim() ? Number(bedel.trim()) : null,
        bedelMetni: bedelMetni.trim() || null,
        yerine: form?.yerine ?? null,
        gerekce: gerekce.trim(),
      });
      setDurum(d);
      setForm(null);
      bildir(form?.yerine ? "Transfer düzeltildi." : "Transfer eklendi.");
    } catch (e) {
      setHata(hataMetni(e, "Kaydedilemedi."));
    } finally {
      setGonderiliyor(false);
    }
  }

  async function gizle(s: OyuncuSaglayiciTransfer) {
    const g = window.prompt(
      `${kulupAdi(s.cikilan, s.cikilanAdi)} → ${kulupAdi(s.gidilen, s.gidilenAdi)} (${tarih(s.tarih)}) gizlensin. Gerekçe?`,
    );
    if (!g || g.trim().length < 3) return;
    setHata("");
    try {
      setDurum(await apiOyuncuTransferYaz(oyuncuId, { islem: "GIZLE", yerine: anahtar(s), gerekce: g.trim() }));
      bildir("Satır gizlendi.");
    } catch (e) {
      setHata(hataMetni(e, "Gizlenemedi."));
    }
  }

  async function geriAl(id: number, soru: string) {
    if (!window.confirm(soru)) return;
    setHata("");
    try {
      setDurum(await apiOyuncuTransferKaldir(id));
      bildir("Geri alındı.");
    } catch (e) {
      setHata(hataMetni(e, "Geri alınamadı."));
    }
  }

  if (!durum) {
    return hata ? <div className="alert alert-error">{hata}</div> : <p className="muted">Yükleniyor…</p>;
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {hata && <div className="alert alert-error">{hata}</div>}
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>
        Elle transfer yalnız oyuncu sayfasında görünür; transfer akışına ve takım kadrolarına girmez.
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="card-title">Kaynaktan gelenler ({durum.saglayici.length})</div>
        {!form && (
          <button className="btn btn-primary btn-sm" onClick={() => formuAc()}>
            Transfer ekle
          </button>
        )}
      </div>

      {form && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, display: "grid", gap: 10 }}>
          <div className="cell-title">
            {form.yerine ? "Kaynağın satırını düzelt (eski satır gizlenir)" : "Yeni transfer"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <TakimSecici etiket="Çıkılan kulüp" deger={cikilan} degisti={setCikilan} serbestAd />
            <TakimSecici etiket="Gidilen kulüp" deger={gidilen} degisti={setGidilen} serbestAd />
            <label>
              <div className="label">Tarih</div>
              <input className="input" type="date" value={gun} onChange={(e) => setGun(e.target.value)} />
            </label>
            <label>
              <div className="label">Tür</div>
              <select className="input" value={tur} onChange={(e) => setTur(e.target.value)}>
                <option value="">Belirtilmedi</option>
                {turler.map((t) => (
                  <option key={t.kod} value={t.kod}>
                    {t.ad}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <div className="label">Bedel (yalnız rakam)</div>
              <input className="input" inputMode="numeric" placeholder="ör. 2500000" value={bedel} onChange={(e) => setBedel(e.target.value)} />
            </label>
            <label>
              <div className="label">Bedel açıklaması (birimiyle)</div>
              <input className="input" maxLength={120} placeholder="ör. 2,5 milyon $" value={bedelMetni} onChange={(e) => setBedelMetni(e.target.value)} />
            </label>
          </div>
          <GerekceAlani deger={gerekce} degisti={setGerekce} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={gonderiliyor} onClick={kaydet}>
              {gonderiliyor ? "Kaydediliyor…" : "Kaydet"}
            </button>
            <button className="btn btn-sm" onClick={() => setForm(null)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {durum.saglayici.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>Kaynakta bu oyuncunun transferi yok.</p>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {durum.saglayici.map((s, i) => (
            <div
              key={`${s.tarih}-${s.cikilan?.id}-${s.gidilen?.id}-${i}`}
              style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center", opacity: s.gizlemeId ? 0.55 : 1 }}
            >
              <span>
                <b>
                  {kulupAdi(s.cikilan, s.cikilanAdi)} → {kulupAdi(s.gidilen, s.gidilenAdi)}
                </b>{" "}
                <span className="muted">
                  · {tarih(s.tarih)} · {s.turAdi ?? "tür yok"}
                  {s.bedelMetni ? ` · ${s.bedelMetni}` : ""}
                </span>
                {s.gizlemeId ? <Rozet tur="gizli">gizli</Rozet> : null}
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                {s.gizlemeId ? (
                  <button className="btn btn-sm" onClick={() => geriAl(s.gizlemeId!, "Gizleme kaldırılsın, satır yeniden görünsün mü? (Yerine girilen düzeltme varsa o da kalkar.)")}>
                    Gizlemeyi geri al
                  </button>
                ) : (
                  <>
                    <button className="btn btn-sm" onClick={() => formuAc(s)}>Düzelt</button>
                    <button className="btn btn-sm" onClick={() => gizle(s)}>Gizle</button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card-title">Elle girilenler ({durum.elle.length})</div>
      {durum.elle.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>Henüz elle girilen transfer yok.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {durum.elle.map((e) => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div>
                <b>
                  {kulupAdi(e.cikilan, e.cikilanAdi)} → {kulupAdi(e.gidilen, e.gidilenAdi)}
                </b>{" "}
                <span className="muted">
                  · {tarih(e.tarih)} · {e.turAdi ?? "tür yok"}
                  {e.bedelMetni ? ` · ${e.bedelMetni}` : ""}
                </span>
                <Rozet tur="elle">{e.yerineId ? "düzeltme" : "elle"}</Rozet>
                {e.kaynakVeriyor && <Rozet tur="kaynak">Kaynak da veriyor · kaldırabilirsin</Rozet>}
                <IzSatiri iz={e.iz} />
              </div>
              <button className="btn btn-sm" onClick={() => geriAl(e.id, `Bu transfer kaydı kaldırılsın mı?${e.yerineId ? " Gizlenen kaynak satırı yeniden görünür." : ""}`)}>
                Kaldır
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sakatlıklar (motor V120)
// ---------------------------------------------------------------------------

function sakatlikBasligi(s: { sebep?: string; turAdi?: string }): string {
  return s.sebep ?? s.turAdi ?? "Sebep yok";
}

function sakatlikDonemi(s: { yil?: string; baslangic?: string; bitis?: string }): string {
  if (s.baslangic) return `${tarih(s.baslangic)} – ${s.bitis ? tarih(s.bitis) : "dönüş belirsiz"}`;
  return s.yil ?? "";
}

function sayiMetni(s: { kacirilanMac?: number; kacirilanGun?: number }): string {
  const p = [];
  if (s.kacirilanMac != null) p.push(`${s.kacirilanMac} maç`);
  if (s.kacirilanGun != null) p.push(`${s.kacirilanGun} gün`);
  return p.length ? ` · ${p.join(", ")}` : "";
}

function Sakatliklar({ oyuncuId, bildir }: { oyuncuId: number; bildir: (m: string) => void }) {
  const [durum, setDurum] = useState<OyuncuSakatlikDurumu | null>(null);
  const [turler, setTurler] = useState<OyuncuSakatlikTuru[]>([]);
  const [hata, setHata] = useState("");
  const [form, setForm] = useState<{ yerine: OyuncuSakatlikAnahtari | null } | null>(null);
  const [tur, setTur] = useState<string>("1");
  const [sebepQ, setSebepQ] = useState("");
  const [sebep, setSebep] = useState<OyuncuSakatlikSebebi | null>(null);
  const [sebepSonuc, setSebepSonuc] = useState<OyuncuSakatlikSebebi[]>([]);
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");
  const [yil, setYil] = useState("");
  const [mac, setMac] = useState("");
  const [gunSayisi, setGunSayisi] = useState("");
  const [takimlar, setTakimlar] = useState<TakimSecimi[]>([]);
  const [gerekce, setGerekce] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useEffect(() => {
    setDurum(null);
    setForm(null);
    apiOyuncuSakatliklar(oyuncuId)
      .then(setDurum)
      .catch((e) => setHata(hataMetni(e, "Sakatlıklar alınamadı.")));
    apiOyuncuSakatlikTurleri().then(setTurler).catch(() => setTurler([]));
  }, [oyuncuId]);

  useEffect(() => {
    if (sebep || sebepQ.trim().length < 2) {
      setSebepSonuc([]);
      return;
    }
    let iptal = false;
    const t = setTimeout(() => {
      apiOyuncuSakatlikSebepAra(sebepQ)
        .then((r) => !iptal && setSebepSonuc(r))
        .catch(() => !iptal && setSebepSonuc([]));
    }, 300);
    return () => {
      iptal = true;
      clearTimeout(t);
    };
  }, [sebepQ, sebep]);

  function anahtar(s: OyuncuSaglayiciSakatlik): OyuncuSakatlikAnahtari {
    return {
      yil: s.yil ?? null,
      tur: s.tur ?? null,
      sebepEn: s.sebepEn ?? null,
      baslangic: s.baslangic ?? null,
      bitis: s.bitis ?? null,
    };
  }

  function formuAc(kaynak?: OyuncuSaglayiciSakatlik) {
    setHata("");
    setForm({ yerine: kaynak ? anahtar(kaynak) : null });
    setTur(kaynak?.tur != null ? String(kaynak.tur) : "1");
    setSebep(kaynak?.sebepEn ? { en: kaynak.sebepEn, tr: kaynak.sebep ?? kaynak.sebepEn } : null);
    setSebepQ("");
    setBaslangic(gunu(kaynak?.baslangic));
    setBitis(gunu(kaynak?.bitis));
    setYil(kaynak?.yil ?? "");
    setMac(kaynak?.kacirilanMac != null ? String(kaynak.kacirilanMac) : "");
    setGunSayisi(kaynak?.kacirilanGun != null ? String(kaynak.kacirilanGun) : "");
    setTakimlar((kaynak?.takimlar ?? []).map((t) => ({ id: t.id, ad: t.ad ?? `#${t.id}` })));
    setGerekce("");
  }

  async function kaydet() {
    if (!baslangic && !yil.trim()) {
      setHata("Başlangıç tarihi ya da yıl gerekli.");
      return;
    }
    if ((mac && !/^\d+$/.test(mac.trim())) || (gunSayisi && !/^\d+$/.test(gunSayisi.trim()))) {
      setHata("Maç ve gün sayısı yalnız rakam olmalı.");
      return;
    }
    if (gerekce.trim().length < 3) {
      setHata("Gerekçe zorunlu.");
      return;
    }
    setGonderiliyor(true);
    setHata("");
    try {
      const d = await apiOyuncuSakatlikYaz(oyuncuId, {
        islem: "EKLE",
        tur: tur ? Number(tur) : null,
        sebepEn: sebep?.en ?? null,
        sebepMetni: sebep ? null : sebepQ.trim() || null,
        baslangic: baslangic || null,
        bitis: bitis || null,
        yil: yil.trim() || null,
        kacirilanMac: mac.trim() ? Number(mac.trim()) : null,
        kacirilanGun: gunSayisi.trim() ? Number(gunSayisi.trim()) : null,
        takimIds: takimlar.flatMap((t) => (t.id ? [t.id] : [])),
        yerine: form?.yerine ?? null,
        gerekce: gerekce.trim(),
      });
      setDurum(d);
      setForm(null);
      bildir(form?.yerine ? "Sakatlık düzeltildi." : "Sakatlık eklendi.");
    } catch (e) {
      setHata(hataMetni(e, "Kaydedilemedi."));
    } finally {
      setGonderiliyor(false);
    }
  }

  async function gizle(s: OyuncuSaglayiciSakatlik) {
    const g = window.prompt(`${sakatlikBasligi(s)} (${sakatlikDonemi(s)}) gizlensin. Gerekçe?`);
    if (!g || g.trim().length < 3) return;
    setHata("");
    try {
      setDurum(await apiOyuncuSakatlikYaz(oyuncuId, { islem: "GIZLE", yerine: anahtar(s), gerekce: g.trim() }));
      bildir("Satır gizlendi.");
    } catch (e) {
      setHata(hataMetni(e, "Gizlenemedi."));
    }
  }

  async function geriAl(id: number, soru: string) {
    if (!window.confirm(soru)) return;
    setHata("");
    try {
      setDurum(await apiOyuncuSakatlikKaldir(id));
      bildir("Geri alındı.");
    } catch (e) {
      setHata(hataMetni(e, "Geri alınamadı."));
    }
  }

  if (!durum) {
    return hata ? <div className="alert alert-error">{hata}</div> : <p className="muted">Yükleniyor…</p>;
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {hata && <div className="alert alert-error">{hata}</div>}
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>
        Elle sakatlık yalnız oyuncu sayfasının sakatlık geçmişinde görünür; takımın güncel sakatlar listesine ve bildirimlere girmez.
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="card-title">Kaynaktan gelenler ({durum.saglayici.length})</div>
        {!form && (
          <button className="btn btn-primary btn-sm" onClick={() => formuAc()}>
            Sakatlık ekle
          </button>
        )}
      </div>

      {form && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, display: "grid", gap: 10 }}>
          <div className="cell-title">
            {form.yerine ? "Kaynağın satırını düzelt (eski satır gizlenir)" : "Yeni sakatlık / ceza"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <label>
              <div className="label">Tür</div>
              <select className="input" value={tur} onChange={(e) => setTur(e.target.value)}>
                <option value="">Belirtilmedi</option>
                {turler.map((t) => (
                  <option key={t.kod} value={t.kod}>
                    {t.ad}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "block" }}>
              <div className="label">Sebep</div>
              {sebep ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <b>{sebep.tr}</b>
                  <button type="button" className="btn btn-sm" onClick={() => setSebep(null)}>
                    Değiştir
                  </button>
                </div>
              ) : (
                <>
                  <input
                    className="input"
                    maxLength={200}
                    placeholder="ör. diz, menisküs, kırmızı kart"
                    value={sebepQ}
                    onChange={(e) => setSebepQ(e.target.value)}
                  />
                  {sebepSonuc.length > 0 && (
                    <div style={{ border: "1px solid var(--border)", borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: "auto" }}>
                      {sebepSonuc.map((r) => (
                        <button
                          type="button"
                          key={r.en}
                          className="btn btn-sm"
                          style={{ display: "block", width: "100%", textAlign: "left", border: 0 }}
                          onClick={() => setSebep(r)}
                        >
                          {r.tr} <span className="muted">· {r.en}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {sebepQ.trim().length >= 2 && (
                    <div className="cell-sub">Listeden seçmezsen yazdığın metin olduğu gibi görünür.</div>
                  )}
                </>
              )}
            </label>
            <label>
              <div className="label">Başlangıç</div>
              <input className="input" type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} />
            </label>
            <label>
              <div className="label">Dönüş (boş: belirsiz)</div>
              <input className="input" type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} />
            </label>
            <label>
              <div className="label">Yıl / sezon (tarih yoksa)</div>
              <input className="input" maxLength={20} placeholder="ör. 1997 ya da 1996-1997" value={yil} onChange={(e) => setYil(e.target.value)} />
            </label>
            <label>
              <div className="label">Kaçırdığı maç</div>
              <input className="input" inputMode="numeric" value={mac} onChange={(e) => setMac(e.target.value)} />
            </label>
            <label>
              <div className="label">Kaçırdığı gün</div>
              <input className="input" inputMode="numeric" value={gunSayisi} onChange={(e) => setGunSayisi(e.target.value)} />
            </label>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <div className="label">Etkilenen takımlar</div>
            {takimlar.map((t, i) => (
              <div key={`${t.id}-${i}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span>
                  <b>{t.ad}</b> <span className="muted">#{t.id}</span>
                </span>
                <button type="button" className="btn btn-sm" onClick={() => setTakimlar(takimlar.filter((_, j) => j !== i))}>
                  Çıkar
                </button>
              </div>
            ))}
            {takimlar.length < 5 && (
              <TakimSecici
                etiket={takimlar.length ? "Takım ekle" : "Takım (isteğe bağlı)"}
                deger={null}
                degisti={(t) => t?.id && !takimlar.some((x) => x.id === t.id) && setTakimlar([...takimlar, t])}
              />
            )}
          </div>
          <GerekceAlani deger={gerekce} degisti={setGerekce} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={gonderiliyor} onClick={kaydet}>
              {gonderiliyor ? "Kaydediliyor…" : "Kaydet"}
            </button>
            <button className="btn btn-sm" onClick={() => setForm(null)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {durum.saglayici.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>Kaynakta bu oyuncunun sakatlık kaydı yok.</p>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {durum.saglayici.map((s, i) => (
            <div
              key={`${s.baslangic}-${s.sebepEn}-${i}`}
              style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center", opacity: s.gizlemeId ? 0.55 : 1 }}
            >
              <span>
                <b>{sakatlikBasligi(s)}</b>{" "}
                <span className="muted">
                  · {s.turAdi ?? "tür yok"} · {sakatlikDonemi(s)}
                  {sayiMetni(s)}
                  {s.takimlar.length ? ` · ${s.takimlar.map((t) => t.ad).join(", ")}` : ""}
                </span>
                {s.gizlemeId ? <Rozet tur="gizli">gizli</Rozet> : null}
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                {s.gizlemeId ? (
                  <button className="btn btn-sm" onClick={() => geriAl(s.gizlemeId!, "Gizleme kaldırılsın, satır yeniden görünsün mü? (Yerine girilen düzeltme varsa o da kalkar.)")}>
                    Gizlemeyi geri al
                  </button>
                ) : (
                  <>
                    <button className="btn btn-sm" onClick={() => formuAc(s)}>Düzelt</button>
                    <button className="btn btn-sm" onClick={() => gizle(s)}>Gizle</button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card-title">Elle girilenler ({durum.elle.length})</div>
      {durum.elle.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>Henüz elle girilen sakatlık yok.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {durum.elle.map((e) => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div>
                <b>{sakatlikBasligi(e)}</b>{" "}
                <span className="muted">
                  · {e.turAdi ?? "tür yok"} · {sakatlikDonemi(e)}
                  {sayiMetni(e)}
                  {e.takimlar.length ? ` · ${e.takimlar.map((t) => t.ad).join(", ")}` : ""}
                </span>
                <Rozet tur="elle">{e.yerineId ? "düzeltme" : "elle"}</Rozet>
                {e.kaynakVeriyor && <Rozet tur="kaynak">Kaynak da veriyor · kaldırabilirsin</Rozet>}
                <IzSatiri iz={e.iz} />
              </div>
              <button className="btn btn-sm" onClick={() => geriAl(e.id, `Bu sakatlık kaydı kaldırılsın mı?${e.yerineId ? " Gizlenen kaynak satırı yeniden görünür." : ""}`)}>
                Kaldır
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4) Sezon istatistikleri (motor V121)
// ---------------------------------------------------------------------------

/** Formda her zaman görünen kalemler; gerisi "Diğer istatistikler"de. */
const ANA_KALEMLER = ["matches", "court", "first", "minutes_played", "goals", "assists", "yellow_cards", "red_cards"];

function sezonOzeti(d: Record<string, number>): string {
  const p: string[] = [];
  if (d.court != null) p.push(`${d.court} maç`);
  else if (d.matches != null) p.push(`${d.matches} maç (kadro)`);
  if (d.goals != null) p.push(`${d.goals} gol`);
  if (d.assists != null) p.push(`${d.assists} asist`);
  if (d.minutes_played != null) p.push(`${d.minutes_played} dk`);
  return p.join(" · ");
}

function LigSecici({ deger, degisti }: { deger: OyuncuDuzeltmeLig | null; degisti: (l: OyuncuDuzeltmeLig | null) => void }) {
  const [q, setQ] = useState("");
  const [sonuc, setSonuc] = useState<OyuncuDuzeltmeLig[]>([]);
  useEffect(() => {
    if (deger || q.trim().length < 2) {
      setSonuc([]);
      return;
    }
    let iptal = false;
    const t = setTimeout(() => {
      apiOyuncuLigAra(q)
        .then((r) => !iptal && setSonuc(r))
        .catch(() => !iptal && setSonuc([]));
    }, 300);
    return () => {
      iptal = true;
      clearTimeout(t);
    };
  }, [q, deger]);
  return (
    <label style={{ display: "block" }}>
      <div className="label">Turnuva (isteğe bağlı)</div>
      {deger ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <b>{deger.ad}</b> <span className="muted">#{deger.id}</span>
          <button type="button" className="btn btn-sm" onClick={() => degisti(null)}>
            Değiştir
          </button>
        </div>
      ) : (
        <>
          <input className="input" placeholder="ör. Süper Lig" value={q} onChange={(e) => setQ(e.target.value)} />
          {sonuc.length > 0 && (
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: "auto" }}>
              {sonuc.map((l) => (
                <button
                  type="button"
                  key={l.id}
                  className="btn btn-sm"
                  style={{ display: "block", width: "100%", textAlign: "left", border: 0 }}
                  onClick={() => {
                    degisti(l);
                    setQ("");
                  }}
                >
                  {l.ad} <span className="muted">#{l.id}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </label>
  );
}

function SezonIstatistikleri({ oyuncuId, bildir }: { oyuncuId: number; bildir: (m: string) => void }) {
  const [durum, setDurum] = useState<OyuncuSezonDurumu | null>(null);
  const [kalemler, setKalemler] = useState<OyuncuSezonKalemi[]>([]);
  const [hata, setHata] = useState("");
  const [form, setForm] = useState<{ kaynak: OyuncuSaglayiciSezon | null } | null>(null);
  const [lig, setLig] = useState<OyuncuDuzeltmeLig | null>(null);
  const [ligSezonlari, setLigSezonlari] = useState<OyuncuLigSezonu[]>([]);
  const [sezonId, setSezonId] = useState<string>("");
  const [sezonAdi, setSezonAdi] = useState("");
  const [takim, setTakim] = useState<TakimSecimi | null>(null);
  const [degerler, setDegerler] = useState<Record<string, string>>({});
  const [ortalama, setOrtalama] = useState("");
  const [digerAcik, setDigerAcik] = useState(false);
  const [gerekce, setGerekce] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useEffect(() => {
    setDurum(null);
    setForm(null);
    apiOyuncuSezonlar(oyuncuId)
      .then(setDurum)
      .catch((e) => setHata(hataMetni(e, "Sezon istatistikleri alınamadı.")));
    apiOyuncuSezonKalemleri().then(setKalemler).catch(() => setKalemler([]));
  }, [oyuncuId]);

  useEffect(() => {
    setSezonId("");
    if (!lig || form?.kaynak) {
      setLigSezonlari([]);
      return;
    }
    let iptal = false;
    apiOyuncuLigSezonlari(lig.id)
      .then((r) => !iptal && setLigSezonlari(r))
      .catch(() => !iptal && setLigSezonlari([]));
    return () => {
      iptal = true;
    };
  }, [lig, form?.kaynak]);

  const kalemAdi = (kod: string) => kalemler.find((k) => k.kod === kod)?.ad ?? kod;

  function formuAc(kaynak?: OyuncuSaglayiciSezon) {
    setHata("");
    setForm({ kaynak: kaynak ?? null });
    setLig(kaynak?.lig ?? null);
    setSezonAdi("");
    setTakim(takimdan(kaynak?.takim));
    const d: Record<string, string> = {};
    for (const [k, v] of Object.entries(kaynak?.degerler ?? {})) {
      if (k !== "rating") d[k] = String(v);
    }
    setDegerler(d);
    setOrtalama(kaynak?.ortalamaPuan != null ? String(kaynak.ortalamaPuan) : "");
    setDigerAcik(Object.keys(d).some((k) => !ANA_KALEMLER.includes(k)));
    setGerekce("");
  }

  async function kaydet() {
    const kaynak = form?.kaynak ?? null;
    const d: Record<string, number> = {};
    for (const [k, v] of Object.entries(degerler)) {
      const s = v.trim();
      if (!s) continue;
      if (!/^\d+$/.test(s)) {
        setHata(`${kalemAdi(k)}: yalnız rakam.`);
        return;
      }
      d[k] = Number(s);
    }
    if (Object.keys(d).length === 0) {
      setHata("En az bir istatistik gir (ör. maç, gol).");
      return;
    }
    const ort = ortalama.trim().replace(",", ".");
    if (ort && !/^\d+(\.\d{1,2})?$/.test(ort)) {
      setHata("Ortalama puan ör. 7.25 biçiminde olmalı.");
      return;
    }
    if (!kaynak && !sezonId && !sezonAdi.trim()) {
      setHata("Sezon gerekli: listeden seç ya da yaz (ör. 1995-1996).");
      return;
    }
    if (!takim) {
      setHata("Kulüp gerekli.");
      return;
    }
    if (gerekce.trim().length < 3) {
      setHata("Gerekçe zorunlu.");
      return;
    }
    setGonderiliyor(true);
    setHata("");
    try {
      const secili = kaynak ? kaynak.sezonId : sezonId ? Number(sezonId) : null;
      const dur = await apiOyuncuSezonYaz(oyuncuId, {
        islem: "EKLE",
        sezonId: secili,
        sezonAdi: secili ? null : sezonAdi.trim(),
        ligId: secili ? null : (lig?.id ?? null),
        takimId: takim.id,
        takimAdi: takim.id ? null : takim.ad,
        degerler: d,
        ortalamaPuan: ort ? Number(ort) : null,
        yerine: kaynak && kaynak.takim ? { sezonId: kaynak.sezonId, takimId: kaynak.takim.id } : null,
        gerekce: gerekce.trim(),
      });
      setDurum(dur);
      setForm(null);
      bildir(kaynak ? "Sezon satırı düzeltildi." : "Sezon eklendi.");
    } catch (e) {
      setHata(hataMetni(e, "Kaydedilemedi."));
    } finally {
      setGonderiliyor(false);
    }
  }

  async function gizle(s: OyuncuSaglayiciSezon) {
    if (!s.takim) return;
    const g = window.prompt(`${s.sezonAd ?? ""} ${s.lig?.ad ?? ""} · ${s.takim.ad ?? ""} satırı gizlensin. Gerekçe?`);
    if (!g || g.trim().length < 3) return;
    setHata("");
    try {
      setDurum(
        await apiOyuncuSezonYaz(oyuncuId, {
          islem: "GIZLE",
          yerine: { sezonId: s.sezonId, takimId: s.takim.id },
          gerekce: g.trim(),
        }),
      );
      bildir("Satır gizlendi.");
    } catch (e) {
      setHata(hataMetni(e, "Gizlenemedi."));
    }
  }

  async function geriAl(id: number, soru: string) {
    if (!window.confirm(soru)) return;
    setHata("");
    try {
      setDurum(await apiOyuncuSezonKaldir(id));
      bildir("Geri alındı.");
    } catch (e) {
      setHata(hataMetni(e, "Geri alınamadı."));
    }
  }

  if (!durum) {
    return hata ? <div className="alert alert-error">{hata}</div> : <p className="muted">Yükleniyor…</p>;
  }
  if (durum.oyuncu.spor !== 1) {
    return <p className="muted">Elle sezon istatistiği şimdilik yalnız futbolcular için.</p>;
  }

  const kalemAlani = (kod: string) => (
    <label key={kod}>
      <div className="label">{kalemAdi(kod)}</div>
      <input
        className="input"
        inputMode="numeric"
        value={degerler[kod] ?? ""}
        onChange={(e) => setDegerler({ ...degerler, [kod]: e.target.value })}
      />
    </label>
  );
  const kaynak = form?.kaynak ?? null;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {hata && <div className="alert alert-error">{hata}</div>}
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>
        Elle sezon satırı yalnız oyuncu sayfasının İstatistikler ve Kariyer bölümünde görünür; lig istatistik
        listelerine, gol krallığına ve karşılaştırma yüzdeliklerine girmez. Sezon bizde kayıtlı değilse (ör. 90'lar)
        sezonu yazmanız yeterli.
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="card-title">Kaynaktan gelenler ({durum.saglayici.length})</div>
        {!form && (
          <button className="btn btn-primary btn-sm" onClick={() => formuAc()}>
            Sezon ekle
          </button>
        )}
      </div>

      {form && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, display: "grid", gap: 10 }}>
          <div className="cell-title">
            {kaynak
              ? `Kaynağın satırını düzelt: ${kaynak.sezonAd ?? ""} ${kaynak.lig?.ad ?? ""} · ${kaynak.takim?.ad ?? ""} (eski satır gizlenir)`
              : "Yeni sezon satırı"}
          </div>
          {!kaynak && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <LigSecici deger={lig} degisti={setLig} />
              {lig && ligSezonlari.length > 0 && (
                <label>
                  <div className="label">Sezon (bizde kayıtlı olanlar)</div>
                  <select className="input" value={sezonId} onChange={(e) => setSezonId(e.target.value)}>
                    <option value="">Listede yok, yazacağım</option>
                    {ligSezonlari.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.ad}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!sezonId && (
                <label>
                  <div className="label">Sezon</div>
                  <input
                    className="input"
                    maxLength={9}
                    placeholder="ör. 1995-1996 ya da 1996"
                    value={sezonAdi}
                    onChange={(e) => setSezonAdi(e.target.value)}
                  />
                </label>
              )}
              <TakimSecici etiket="Kulüp" deger={takim} degisti={setTakim} serbestAd />
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {ANA_KALEMLER.map(kalemAlani)}
            <label>
              <div className="label">Ortalama puan (0-10)</div>
              <input className="input" inputMode="decimal" placeholder="ör. 7.25" value={ortalama} onChange={(e) => setOrtalama(e.target.value)} />
            </label>
          </div>
          <div>
            <button type="button" className="btn btn-sm" onClick={() => setDigerAcik(!digerAcik)}>
              {digerAcik ? "Diğer istatistikleri gizle" : "Diğer istatistikler (şut, pas, savunma...)"}
            </button>
          </div>
          {digerAcik && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              {kalemler.filter((k) => !ANA_KALEMLER.includes(k.kod)).map((k) => kalemAlani(k.kod))}
            </div>
          )}
          <div className="cell-sub">Boş bırakılan istatistik oyuncu sayfasında görünmez (sıfır yazılmaz).</div>
          <GerekceAlani deger={gerekce} degisti={setGerekce} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={gonderiliyor} onClick={kaydet}>
              {gonderiliyor ? "Kaydediliyor…" : "Kaydet"}
            </button>
            <button className="btn btn-sm" onClick={() => setForm(null)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {durum.saglayici.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>Kaynakta bu oyuncunun sezon istatistiği yok.</p>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {durum.saglayici.map((s) => (
            <div
              key={`${s.sezonId}-${s.takim?.id}`}
              style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center", opacity: s.gizlemeId ? 0.55 : 1 }}
            >
              <span>
                <b>{s.sezonAd ?? "—"}</b>{" "}
                <span className="muted">
                  · {s.lig?.ad ?? "turnuva yok"} · {s.takim?.ad ?? "—"}
                  {sezonOzeti(s.degerler) ? ` · ${sezonOzeti(s.degerler)}` : ""}
                  {s.ortalamaPuan != null ? ` · ort. ${s.ortalamaPuan}` : ""}
                </span>
                {s.gizlemeId ? <Rozet tur="gizli">gizli</Rozet> : null}
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                {s.gizlemeId ? (
                  <button className="btn btn-sm" onClick={() => geriAl(s.gizlemeId!, "Gizleme kaldırılsın, satır yeniden görünsün mü? (Yerine girilen düzeltme varsa o da kalkar.)")}>
                    Gizlemeyi geri al
                  </button>
                ) : (
                  <>
                    <button className="btn btn-sm" onClick={() => formuAc(s)}>Düzelt</button>
                    <button className="btn btn-sm" onClick={() => gizle(s)}>Gizle</button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card-title">Elle girilenler ({durum.elle.length})</div>
      {durum.elle.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>Henüz elle girilen sezon yok.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {durum.elle.map((e) => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div>
                <b>{e.sezonAd ?? "—"}</b>{" "}
                <span className="muted">
                  · {e.lig?.ad ?? "turnuva yok"} · {e.takim?.ad ?? e.takimAdi ?? "—"}
                  {sezonOzeti(e.degerler) ? ` · ${sezonOzeti(e.degerler)}` : ""}
                  {e.ortalamaPuan != null ? ` · ort. ${e.ortalamaPuan}` : ""}
                </span>
                <Rozet tur="elle">{e.yerineId ? "düzeltme" : "elle"}</Rozet>
                {e.kaynakVeriyor && <Rozet tur="kaynak">Kaynak da veriyor · kaldırabilirsin</Rozet>}
                <IzSatiri iz={e.iz} />
              </div>
              <button className="btn btn-sm" onClick={() => geriAl(e.id, `Bu sezon satırı kaldırılsın mı?${e.yerineId ? " Gizlenen kaynak satırı yeniden görünür." : ""}`)}>
                Kaldır
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sayfa
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Genel Bakış metni (V122)
// ---------------------------------------------------------------------------

const BIYOGRAFI_EN_COK = 5000;

function GenelBakis({ oyuncuId, bildir }: { oyuncuId: number; bildir: (m: string) => void }) {
  const [durum, setDurum] = useState<OyuncuBiyografiDurumu | null>(null);
  const [hata, setHata] = useState("");
  const [metin, setMetin] = useState("");
  const [gerekce, setGerekce] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [gecmisAcik, setGecmisAcik] = useState(false);

  function yukle(d: OyuncuBiyografiDurumu) {
    setDurum(d);
    setMetin(d.guncel?.metin ?? "");
    setGerekce("");
  }

  useEffect(() => {
    setDurum(null);
    setHata("");
    apiOyuncuBiyografi(oyuncuId)
      .then(yukle)
      .catch((e) => setHata(hataMetni(e, "Genel bakış metni alınamadı.")));
  }, [oyuncuId]);

  async function kaydet() {
    setHata("");
    setGonderiliyor(true);
    try {
      yukle(await apiOyuncuBiyografiYaz(oyuncuId, metin, gerekce));
      bildir("Genel bakış metni kaydedildi.");
    } catch (e) {
      setHata(hataMetni(e, "Kaydedilemedi."));
    } finally {
      setGonderiliyor(false);
    }
  }

  async function kaldir() {
    if (!window.confirm("Genel bakış metni oyuncu sayfasından kaldırılsın mı? (Önceki sürümler saklanır.)")) return;
    setHata("");
    try {
      yukle(await apiOyuncuBiyografiKaldir(oyuncuId));
      bildir("Genel bakış metni kaldırıldı.");
    } catch (e) {
      setHata(hataMetni(e, "Kaldırılamadı."));
    }
  }

  if (!durum) {
    return hata ? <div className="alert alert-error">{hata}</div> : <p className="muted">Yükleniyor…</p>;
  }
  const degisti = metin.trim() !== (durum.guncel?.metin ?? "").trim();
  const uzunluk = metin.trim().length;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {hata && <div className="alert alert-error">{hata}</div>}
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>
        Oyuncu sayfasının Genel Bakış bölümünde &quot;Hakkında&quot; kartı olarak görünür (uygulama ve web). Düz yazı yazın;
        paragrafları boş satırla ayırın. Kaynak bu metni vermiyor, tamamen sizin girdiğiniz metin. Her kayıtta önceki sürüm
        saklanır.
      </p>
      {durum.guncel ? (
        <div className="cell-sub">
          Yayındaki metin: <IzSatiri iz={durum.guncel.iz} />
        </div>
      ) : (
        <div className="cell-sub">Bu oyuncunun henüz genel bakış metni yok.</div>
      )}
      <label style={{ display: "block" }}>
        <div className="label">Metin</div>
        <textarea
          className="input"
          rows={12}
          maxLength={BIYOGRAFI_EN_COK + 200}
          placeholder="ör. Sergen Yalçın, 5 Kasım 1972'de İstanbul'da doğdu. Futbola Beşiktaş altyapısında başladı…"
          value={metin}
          onChange={(e) => setMetin(e.target.value)}
          style={{ resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }}
        />
        <div className="cell-sub" style={{ color: uzunluk > BIYOGRAFI_EN_COK ? "var(--danger, #c0392b)" : undefined }}>
          {uzunluk} / {BIYOGRAFI_EN_COK} karakter
        </div>
      </label>
      <GerekceAlani deger={gerekce} degisti={setGerekce} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          className="btn btn-primary btn-sm"
          disabled={gonderiliyor || !degisti || uzunluk === 0 || uzunluk > BIYOGRAFI_EN_COK || gerekce.trim().length < 3}
          onClick={kaydet}
        >
          {gonderiliyor ? "Kaydediliyor…" : durum.guncel ? "Değişikliği kaydet" : "Kaydet"}
        </button>
        {degisti && durum.guncel && (
          <button className="btn btn-sm" onClick={() => setMetin(durum.guncel?.metin ?? "")}>
            Değişikliği bırak
          </button>
        )}
        {durum.guncel && (
          <button className="btn btn-sm btn-danger" onClick={kaldir}>
            Metni kaldır
          </button>
        )}
      </div>
      {durum.gecmis.length > 0 && (
        <div>
          <button className="btn btn-sm" onClick={() => setGecmisAcik(!gecmisAcik)}>
            {gecmisAcik ? "Önceki sürümleri gizle" : `Önceki sürümler (${durum.gecmis.length})`}
          </button>
          {gecmisAcik && (
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {durum.gecmis.map((s) => (
                <div key={s.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
                  <IzSatiri iz={s.iz} />
                  <div className="cell-sub">
                    Kaldırıldı: {s.kaldiran ?? "—"}, {tarihSaat(s.kaldirildi)}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 6 }}>{s.metin}</div>
                  <button className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => setMetin(s.metin)}>
                    Bu sürümü düzenleyiciye al
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Sekme = "genel" | "basarilar" | "transferler" | "sakatliklar" | "sezonlar";

export default function TeleskorOyuncuDuzenlemeClient() {
  const [q, setQ] = useState("");
  const [sonuc, setSonuc] = useState<KadroOyuncuBulgusu[]>([]);
  const [araniyor, setAraniyor] = useState(false);
  const [oyuncu, setOyuncu] = useState<OyuncuDuzeltmeOyuncu | null>(null);
  const [sekme, setSekme] = useState<Sekme>("genel");
  const [bilgi, setBilgi] = useState("");
  const bilgiZamani = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adres çubuğundaki ?oyuncu= ile doğrudan açılış (paylaşılabilir bağlantı).
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("oyuncu"));
    if (Number.isInteger(id) && id > 0) {
      apiOyuncuOduller(id)
        .then((d) => setOyuncu(d.oyuncu))
        .catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setSonuc([]);
      return;
    }
    let iptal = false;
    const t = setTimeout(async () => {
      setAraniyor(true);
      try {
        const r = await apiKadroOyuncuAra(q);
        if (!iptal) setSonuc(r);
      } catch {
        if (!iptal) setSonuc([]);
      } finally {
        if (!iptal) setAraniyor(false);
      }
    }, 300);
    return () => {
      iptal = true;
      clearTimeout(t);
    };
  }, [q]);

  function sec(o: OyuncuDuzeltmeOyuncu) {
    setOyuncu(o);
    setQ("");
    setSonuc([]);
    const u = new URL(window.location.href);
    u.searchParams.set("oyuncu", String(o.id));
    window.history.replaceState(null, "", u.toString());
  }

  function bildir(m: string) {
    setBilgi(m);
    if (bilgiZamani.current) clearTimeout(bilgiZamani.current);
    bilgiZamani.current = setTimeout(() => setBilgi(""), 5000);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
      <div className="card card-pad">
        <div className="card-title">Oyuncu Profili</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          Oyuncu sayfasının genel bakış metnini yazın; eksik başarıları, transferleri, sakatlıkları ve sezon istatistiklerini tamamlayın. Elle girilenler uygulamada
          ve web'de oyuncu sayfasına hemen yansır, sonraki veri güncellemesi silmez. Kaynağın yanlış
          satırını gizleyebilir ya da düzeltebilirsiniz. Doğum tarihi, boy, mevki ve fotoğraf için
          Veri Düzeltme sayfasını kullanın.
        </p>
        <label style={{ display: "block", marginTop: 10 }}>
          <div className="label">Oyuncu ara</div>
          <input className="input" placeholder="ör. Sergen Yalçın" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {araniyor && <div className="cell-sub">Aranıyor…</div>}
        {sonuc.length > 0 && (
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, marginTop: 6, maxHeight: 260, overflowY: "auto" }}>
            {sonuc.map((o) => (
              <button
                key={o.id}
                className="btn btn-sm"
                style={{ display: "block", width: "100%", textAlign: "left", border: 0 }}
                onClick={() => sec({ id: o.id, ad: o.ad, foto: o.foto, spor: 1 })}
              >
                {o.ad}{" "}
                <span className="muted">
                  {o.kartTakim?.ad ? `· ${o.kartTakim.ad}` : ""}
                  {o.dogum ? ` · ${tarih(o.dogum)}` : ""} #{o.id}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {bilgi && <div className="alert alert-success">{bilgi}</div>}

      {oyuncu && (
        <div className="card card-pad" style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {oyuncu.foto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={oyuncu.foto} alt="" width={48} height={48} style={{ borderRadius: 24, objectFit: "cover" }} />
            )}
            <div>
              <div className="cell-title">{oyuncu.ad}</div>
              <div className="cell-sub">#{oyuncu.id}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className={`btn btn-sm ${sekme === "genel" ? "btn-primary" : ""}`} onClick={() => setSekme("genel")}>
              Genel Bakış
            </button>
            <button className={`btn btn-sm ${sekme === "basarilar" ? "btn-primary" : ""}`} onClick={() => setSekme("basarilar")}>
              Başarılar
            </button>
            <button className={`btn btn-sm ${sekme === "transferler" ? "btn-primary" : ""}`} onClick={() => setSekme("transferler")}>
              Transferler
            </button>
            <button className={`btn btn-sm ${sekme === "sakatliklar" ? "btn-primary" : ""}`} onClick={() => setSekme("sakatliklar")}>
              Sakatlıklar
            </button>
            <button className={`btn btn-sm ${sekme === "sezonlar" ? "btn-primary" : ""}`} onClick={() => setSekme("sezonlar")}>
              İstatistikler
            </button>
          </div>
          {sekme === "genel" ? (
            <GenelBakis oyuncuId={oyuncu.id} bildir={bildir} />
          ) : sekme === "basarilar" ? (
            <Basarilar oyuncuId={oyuncu.id} bildir={bildir} />
          ) : sekme === "transferler" ? (
            <Transferler oyuncuId={oyuncu.id} bildir={bildir} />
          ) : sekme === "sakatliklar" ? (
            <Sakatliklar oyuncuId={oyuncu.id} bildir={bildir} />
          ) : (
            <SezonIstatistikleri oyuncuId={oyuncu.id} bildir={bildir} />
          )}
        </div>
      )}
    </div>
  );
}
