"use client";

import { useState } from "react";
import { apiSiteHaritasiIndexNow } from "@/lib/api-client";
import type { SiteHaritasiAyarlari } from "@/lib/types";
import { hataMetni, yolaCevir } from "./ortak";

/**
 * IndexNow ile elle bildirim (V73): yeni ya da değişen adresleri Bing,
 * Yandex ve protokolü kullanan arama motorlarına hemen bildirir. Google
 * IndexNow kullanmıyor (Google için Search Console'daki "URL denetimi").
 * Haberler yayınlanınca zaten kendiliğinden bildiriliyor.
 */
export default function IndexNowKarti({
  veri,
  yenile,
  bildir,
}: {
  veri: SiteHaritasiAyarlari;
  yenile: () => Promise<void>;
  bildir: (m: string) => void;
}) {
  const [metin, setMetin] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<string | null>(null);
  const { acik, kalan, adresTavani } = veri.indexNow;

  const satirlar = metin
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const gecersiz = satirlar.filter((s) => yolaCevir(s) == null);
  const benzersiz = new Set(satirlar.map((s) => yolaCevir(s)).filter(Boolean)).size;

  async function gonder() {
    setMesgul(true);
    setHata(null);
    setSonuc(null);
    try {
      const s = await apiSiteHaritasiIndexNow(satirlar);
      setSonuc(`${s.gonderilen} adres bildirildi (yanıt ${s.durum}). Bugün kalan hak: ${s.kalan}.`);
      setMetin("");
      bildir(`IndexNow: ${s.gonderilen} adres bildirildi.`);
      await yenile();
    } catch (e) {
      setHata(hataMetni(e, "Bildirilemedi."));
    } finally {
      setMesgul(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Arama motoruna bildir (IndexNow)</div>
        <span className="badge">{acik ? `bugün kalan: ${kalan}` : "kapalı"}</span>
      </div>
      <div className="card-pad">
        <div className="hint" style={{ marginBottom: 12 }}>
          Yeni ya da değişen sayfaları Bing, Yandex ve IndexNow kullanan arama motorlarına hemen
          bildirir (haritanın okunmasını beklemeden). Google bu yöntemi kullanmıyor; Google için
          Search Console&apos;daki &quot;URL denetimi&quot; ile dizine ekleme isteyin. Yayınlanan haberler
          zaten kendiliğinden bildiriliyor. Her satıra bir adres; tek seferde en çok {adresTavani} adres,
          günde en çok 20 gönderim.
        </div>
        {!acik && (
          <div className="alert alert-warning">IndexNow bu sunucuda henüz açılmamış; yöneticiye iletin.</div>
        )}
        <div className="field">
          <label className="label">Adresler</label>
          <textarea
            className="input"
            rows={6}
            value={metin}
            disabled={!acik}
            placeholder={"https://www.teleskor.com.tr/futbol/lig/...\n/haber/..."}
            onChange={(e) => setMetin(e.target.value)}
          />
          <div className="cell-sub" style={{ marginTop: 4 }}>
            {benzersiz} adres{gecersiz.length > 0 && ` · ${gecersiz.length} satır sitenin adresi değil`}
          </div>
          {gecersiz.length > 0 && (
            <div className="field-error">Geçersiz: {gecersiz.slice(0, 3).join(", ")}{gecersiz.length > 3 ? "…" : ""}</div>
          )}
        </div>
        <div className="sh-dugmeler">
          <button
            className="btn btn-primary"
            disabled={!acik || mesgul || benzersiz === 0 || benzersiz > adresTavani || gecersiz.length > 0 || kalan === 0}
            onClick={() => void gonder()}
          >
            {mesgul ? "Gönderiliyor…" : "Bildir"}
          </button>
        </div>
        {benzersiz > adresTavani && (
          <div className="field-error">Tek seferde en çok {adresTavani} adres.</div>
        )}
        {hata && <div className="alert alert-error" style={{ marginTop: 10 }}>{hata}</div>}
        {sonuc && <div className="alert alert-success" style={{ marginTop: 10 }}>{sonuc}</div>}
      </div>
    </div>
  );
}
