"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  apiTeleskorSohbetMaclar,
  apiTeleskorSohbetMacMesajlari,
  apiTeleskorSohbetUyeMesajlari,
  apiTeleskorMesajSil,
  ApiError,
} from "@/lib/api-client";
import type {
  TeleskorSohbetMacKunye,
  TeleskorSohbetMacSatiri,
  TeleskorSohbetMesaji,
  TeleskorSohbetMesajSayfasi,
} from "@/lib/types";
import { formatDate, goreliZaman } from "@/lib/format";
import TeleskorOnayModal from "./TeleskorOnayModal";

/**
 * MAÇ SOHBETLERİ — hangi maçta sohbette ne yazılmış (4 Ekim 2026).
 *
 * <p>Solda sohbeti olan maçlar (en son yazılan önce; liste Teleskor'daki maç
 * başına özetten, dakikada bir tazelenir), sağda seçilen maçın mesajları
 * (en yeni önce, "Daha eski" ile geriye). Mesajlarda arama yalnız o maçın
 * içinde; üyenin adına basınca o maçta yalnız onun mesajları, "Bütün
 * mesajları" ile bütün maçlardaki mesajları. Silme var olan moderasyon
 * ucundan (üstündeki şikayetler de kapanır).
 *
 * <p>Büyük hacim için: her liste imleçli ve sayfalı (50), hiçbir ekran
 * bütün mesajları birden çekmez.
 */

type Secim = { tur: "mac"; macId: number } | { tur: "uye"; id: number; ad: string };

export function macAdi(k: TeleskorSohbetMacKunye | undefined, macId: number): string {
  if (!k?.ev && !k?.dep) return `Maç #${macId}`;
  const skor = k.evSkor != null && k.depSkor != null ? ` ${k.evSkor}-${k.depSkor}` : "";
  return `${k.ev ?? "?"}${skor ? skor : " -"} ${k.dep ?? "?"}`;
}

function macAlt(k: TeleskorSohbetMacKunye | undefined): string {
  return [k?.lig, k?.baslama ? formatDate(k.baslama) : null].filter(Boolean).join(" · ");
}

export default function TeleskorMacSohbetleri() {
  // ---- maç listesi
  const [maclar, setMaclar] = useState<TeleskorSohbetMacSatiri[]>([]);
  const [sonraki, setSonraki] = useState<{ once: string; onceMac: number } | null>(null);
  const [sikayetli, setSikayetli] = useState(false);
  const [listeYukleniyor, setListeYukleniyor] = useState(true);
  const [ozetZamani, setOzetZamani] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const listeNo = useRef(0);

  // ---- seçim + mesajlar
  const [secim, setSecim] = useState<Secim | null>(null);
  const [sayfa, setSayfa] = useState<TeleskorSohbetMesajSayfasi | null>(null);
  const [mesajlar, setMesajlar] = useState<TeleskorSohbetMesaji[]>([]);
  const [oncesi, setOncesi] = useState<number | null>(null);
  const [silinen, setSilinen] = useState(false);
  const [arama, setArama] = useState("");
  const [q, setQ] = useState("");
  const [uyeSuzgeci, setUyeSuzgeci] = useState<{ id: number; ad: string } | null>(null);
  const [mesajYukleniyor, setMesajYukleniyor] = useState(false);
  const [onay, setOnay] = useState<TeleskorSohbetMesaji | null>(null);
  const mesajNo = useRef(0);
  const sagBolme = useRef<HTMLDivElement>(null);

  const listeYukle = useCallback(async (devam: boolean, imlec?: { once: string; onceMac: number } | null) => {
    const no = ++listeNo.current;
    setListeYukleniyor(true);
    try {
      const r = await apiTeleskorSohbetMaclar({
        sikayetli, once: devam ? imlec?.once : undefined, onceMac: devam ? imlec?.onceMac : undefined,
      });
      if (no !== listeNo.current) return;
      setMaclar((eski) => (devam ? [...eski, ...r.maclar] : r.maclar));
      setSonraki(r.sonraki ?? null);
      setOzetZamani(r.ozetGuncellendi ?? null);
      setHata(null);
    } catch (e) {
      if (no === listeNo.current) setHata(e instanceof ApiError ? e.message : "Maç sohbetleri alınamadı.");
    } finally {
      if (no === listeNo.current) setListeYukleniyor(false);
    }
  }, [sikayetli]);

  useEffect(() => {
    listeYukle(false);
  }, [listeYukle]);

  const mesajYukle = useCallback(async (devam: boolean, imlec?: number | null) => {
    if (!secim) return;
    const no = ++mesajNo.current;
    setMesajYukleniyor(true);
    try {
      const r = secim.tur === "mac"
        ? await apiTeleskorSohbetMacMesajlari(secim.macId, {
          silinen, q: q || undefined, kullaniciId: uyeSuzgeci?.id, oncesi: devam ? imlec ?? undefined : undefined,
        })
        : await apiTeleskorSohbetUyeMesajlari(secim.id, { oncesi: devam ? imlec ?? undefined : undefined });
      if (no !== mesajNo.current) return;
      setMesajlar((eski) => (devam ? [...eski, ...r.mesajlar] : r.mesajlar));
      setOncesi(r.sonrakiOncesi ?? null);
      // İlk sayfanın özeti/künyesi sonraki sayfalarda gelmez: korunur.
      setSayfa((eski) => (devam && eski ? { ...eski, maclar: { ...eski.maclar, ...r.maclar } } : r));
      setHata(null);
    } catch (e) {
      if (no === mesajNo.current) setHata(e instanceof ApiError ? e.message : "Mesajlar alınamadı.");
    } finally {
      if (no === mesajNo.current) setMesajYukleniyor(false);
    }
  }, [secim, silinen, q, uyeSuzgeci]);

  useEffect(() => {
    if (!secim) return;
    setMesajlar([]);
    setSayfa(null);
    mesajYukle(false);
  }, [secim, mesajYukle]);

  function macSec(macId: number) {
    setSilinen(false);
    setArama("");
    setQ("");
    setUyeSuzgeci(null);
    setSecim({ tur: "mac", macId });
    // Dar ekranda bölmeler alt alta: mesajlara kaydır.
    window.setTimeout(() => sagBolme.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function aramaUygula(e: React.FormEvent) {
    e.preventDefault();
    const t = arama.trim();
    if (t.length === 1) {
      setHata("Arama en az 2 karakter olmalı.");
      return;
    }
    setQ(t);
  }

  const secilenMac = secim?.tur === "mac" ? maclar.find((m) => m.macId === secim.macId) : undefined;
  const baslik = secim?.tur === "uye"
    ? `${secim.ad} — bütün mesajları`
    : secim ? macAdi(sayfa?.mac ?? secilenMac?.mac, secim.macId) : "";

  return (
    <div className="stack">
      <div className="spread">
        <div className="muted" style={{ fontSize: 13 }}>
          Sohbeti olan maçlar, en son yazılan önce. Liste dakikada bir güncellenir
          {ozetZamani ? ` (son: ${goreliZaman(ozetZamani) ?? formatDate(ozetZamani)})` : ""}; mesajlar anlık.
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label className="check-row" style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={sikayetli} onChange={(e) => setSikayetli(e.target.checked)} />
            Yalnız şikayetli maçlar
          </label>
          <button className="btn btn-sm" onClick={() => { listeYukle(false); if (secim) mesajYukle(false); }}>Yenile</button>
        </div>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      <div className="destek-grid">
        <div className="card">
          <div className="destek-liste">
            {maclar.length === 0 && !listeYukleniyor ? (
              <div className="destek-bos muted">{sikayetli ? "Bekleyen şikayeti olan maç yok." : "Henüz sohbet yazılmış maç yok."}</div>
            ) : (
              maclar.map((m) => (
                <button key={m.macId} type="button"
                  className={`destek-satir${secim?.tur === "mac" && secim.macId === m.macId ? " aktif" : ""}`}
                  onClick={() => macSec(m.macId)}>
                  <div className="destek-satir-ust">
                    <span className="destek-konu">{macAdi(m.mac, m.macId)}</span>
                    {m.bekleyenSikayet > 0 && (
                      <span className="badge" style={{ background: "var(--danger-soft, #fde8e8)", color: "var(--danger, #b42318)" }}>
                        {m.bekleyenSikayet} şikayet
                      </span>
                    )}
                  </div>
                  <div className="destek-onizleme">{macAlt(m.mac) || `#${m.macId}`}</div>
                  <div className="destek-alt muted">
                    <span>{m.mesaj.toLocaleString("tr-TR")} mesaj</span>
                    <span title={formatDate(m.sonMesaj)}>son: {goreliZaman(m.sonMesaj) ?? formatDate(m.sonMesaj)}</span>
                  </div>
                </button>
              ))
            )}
            {listeYukleniyor && <div className="destek-bos muted">Yükleniyor…</div>}
            {sonraki && !listeYukleniyor && (
              <div style={{ padding: 8 }}>
                <button className="btn btn-sm" style={{ width: "100%" }} onClick={() => listeYukle(true, sonraki)}>
                  Daha fazla maç
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="card" ref={sagBolme}>
          {!secim ? (
            <div className="destek-bos muted">Mesajları görmek için soldan bir maç seç.</div>
          ) : (
            <div className="destek-yazisma">
              <div className="destek-baslik" style={{ flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{baslik}</div>
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    {secim.tur === "mac" ? (
                      <>
                        {macAlt(sayfa?.mac ?? secilenMac?.mac)}
                        {sayfa?.ozet && (
                          <>
                            {macAlt(sayfa?.mac ?? secilenMac?.mac) ? " · " : ""}
                            {sayfa.ozet.gorunen.toLocaleString("tr-TR")} görünür · {sayfa.ozet.silinen.toLocaleString("tr-TR")} silinen ·{" "}
                            {sayfa.ozet.yazar.toLocaleString("tr-TR")} kişi
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        Bütün maçlar, silinenler dâhil ·{" "}
                        <Link href={`/teleskor/uyeler?q=${encodeURIComponent(secim.ad)}`}>Üye kartı</Link>
                      </>
                    )}
                  </div>
                </div>
                {secim.tur === "uye" && (
                  <button className="btn btn-sm" onClick={() => setSecim(null)}>Kapat</button>
                )}
              </div>

              {secim.tur === "mac" && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
                  <form onSubmit={aramaUygula} style={{ display: "flex", gap: 6, flex: "1 1 260px" }}>
                    <input className="input" value={arama} onChange={(e) => setArama(e.target.value)} maxLength={100}
                      placeholder="Bu maçın mesajlarında ara" style={{ padding: "7px 10px" }} />
                    <button className="btn btn-sm" type="submit">Ara</button>
                    {q && <button className="btn btn-sm" type="button" onClick={() => { setArama(""); setQ(""); }}>Temizle</button>}
                  </form>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className={`btn btn-sm${!silinen ? " btn-primary" : ""}`} onClick={() => setSilinen(false)}>Görünür</button>
                    <button className={`btn btn-sm${silinen ? " btn-primary" : ""}`} onClick={() => setSilinen(true)}>Silinenler</button>
                  </div>
                  {uyeSuzgeci && (
                    <span className="chip">
                      Yalnız {uyeSuzgeci.ad}
                      <button type="button" className="chip-x" aria-label="Süzgeci kaldır" onClick={() => setUyeSuzgeci(null)}>×</button>
                    </span>
                  )}
                </div>
              )}

              <div className="destek-mesajlar" style={{ padding: "6px 0" }}>
                {mesajlar.length === 0 && !mesajYukleniyor && (
                  <div className="destek-bos muted">{q ? "Bu aramaya uyan mesaj yok." : silinen ? "Silinen mesaj yok." : "Mesaj yok."}</div>
                )}
                {mesajlar.map((m) => (
                  <MesajSatiri key={m.id} m={m}
                    macBilgisi={secim.tur === "uye" ? macAdi(sayfa?.maclar?.[String(m.macId)], m.macId) : null}
                    onUye={() => {
                      const ad = m.yazar.kullaniciAdi ?? `#${m.yazar.id}`;
                      if (secim.tur === "mac") setUyeSuzgeci({ id: m.yazar.id, ad });
                    }}
                    onUyeTumu={() => setSecim({ tur: "uye", id: m.yazar.id, ad: m.yazar.kullaniciAdi ?? `#${m.yazar.id}` })}
                    onMac={secim.tur === "uye" ? () => macSec(m.macId) : undefined}
                    onSil={m.silindi ? undefined : () => setOnay(m)} />
                ))}
                {mesajYukleniyor && <div className="destek-bos muted">Yükleniyor…</div>}
                {oncesi != null && !mesajYukleniyor && (
                  <div style={{ padding: "8px 18px" }}>
                    <button className="btn btn-sm" style={{ width: "100%" }} onClick={() => mesajYukle(true, oncesi)}>Daha eski mesajlar</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {onay && (
        <TeleskorOnayModal
          baslik="Mesajı sil"
          uyari={`${onay.yazar.kullaniciAdi ?? "?"} kullanıcısının mesajı silinecek; bu mesaja açılmış bekleyen şikayetler de kapanır. Mesaj kullanıcılara görünmez olur, kayıt kanıt olarak kalır.`}
          alanEtiketi="Not (isteğe bağlı — yalnız kendi kaydın için)"
          alanIpucu="Boş bırakabilirsin"
          zorunlu={false}
          onayMetni="Mesajı sil"
          tehlikeli
          onKapat={() => setOnay(null)}
          onOnayla={async () => {
            await apiTeleskorMesajSil(onay.id);
            const an = new Date().toISOString();
            // Görünür listede satır silindi işaretiyle kalır (yönetici ne yaptığını görsün); yenileyince düşer.
            setMesajlar((l) => l.map((x) => (x.id === onay.id ? { ...x, silindi: an, bekleyenSikayet: 0 } : x)));
            setOnay(null);
          }}
        />
      )}
    </div>
  );
}

function MesajSatiri({ m, macBilgisi, onUye, onUyeTumu, onMac, onSil }: {
  m: TeleskorSohbetMesaji;
  macBilgisi: string | null;
  onUye: () => void;
  onUyeTumu: () => void;
  onMac?: () => void;
  onSil?: () => void;
}) {
  const susturulmus = m.yazar.susturmaBitis && Date.parse(m.yazar.susturmaBitis) > Date.now();
  return (
    <div style={{ display: "flex", gap: 10, padding: "9px 18px", borderBottom: "1px solid var(--border)", opacity: m.silindi ? 0.6 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", fontSize: 12.5 }}>
          <button type="button" onClick={onUye} title="Bu maçta yalnız bu üyenin mesajları"
            style={{ border: 0, background: "none", padding: 0, font: "inherit", fontWeight: 700, color: "var(--brand)", cursor: "pointer" }}>
            {m.yazar.kullaniciAdi ?? `#${m.yazar.id}`}
          </button>
          <button type="button" onClick={onUyeTumu} className="muted"
            style={{ border: 0, background: "none", padding: 0, font: "inherit", fontSize: 11.5, cursor: "pointer", textDecoration: "underline" }}>
            bütün mesajları
          </button>
          {m.yazar.durum && m.yazar.durum !== "ACTIVE" && <span className="badge">{m.yazar.durum}</span>}
          {susturulmus && <span className="badge">susturulmuş</span>}
          <span className="muted" title={formatDate(m.yazildi)}>{formatDate(m.yazildi)}</span>
          {macBilgisi && (
            onMac ? (
              <button type="button" onClick={onMac} className="muted"
                style={{ border: 0, background: "none", padding: 0, font: "inherit", cursor: "pointer", textDecoration: "underline" }}>
                {macBilgisi}
              </button>
            ) : <span className="muted">{macBilgisi}</span>
          )}
          {m.bekleyenSikayet > 0 && (
            <span className="badge" style={{ background: "var(--danger-soft, #fde8e8)", color: "var(--danger, #b42318)" }}>
              {m.bekleyenSikayet} bekleyen şikayet
            </span>
          )}
          {m.silindi && <span className="badge">silindi · {formatDate(m.silindi)}</span>}
        </div>
        <div style={{ marginTop: 3, fontSize: 13.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.metin}</div>
      </div>
      {onSil && (
        <button className="btn btn-sm btn-danger" style={{ alignSelf: "center" }} onClick={onSil}>Sil</button>
      )}
    </div>
  );
}
