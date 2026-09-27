"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ApiError,
  apiTeleskorHaberAktar,
  apiTeleskorHaberAktarimDurumu,
  apiTeleskorHaberEslesmeyen,
  apiTeleskorHaberEslesmeyenKaldir,
  apiTeleskorHaberler,
} from "@/lib/api-client";
import { CATEGORY_LABELS } from "@/lib/labels";
import type {
  NewsCategory,
  TeleskorHaberAktarimDurumu,
  TeleskorHaberEslesmeyen,
  TeleskorHaberListesi as Liste,
} from "@/lib/types";

/**
 * TELESKOR → HABERLER: liste, ScoresTV'den aktarım, eşleşmeyen bağlantılar.
 */

const DURUM_ADI: Record<string, string> = {
  TASLAK: "Taslak",
  ZAMANLI: "Zamanlanmış",
  YAYINDA: "Yayında",
  ARSIV: "Arşiv",
};

type Sekme = "liste" | "aktarim" | "eslesmeyen";

export default function TeleskorHaberListesi() {
  const [sekme, setSekme] = useState<Sekme>("liste");
  return (
    <div className="stack">
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Teleskor Haberleri</h1>
        <Link className="btn btn-primary" href="/teleskor/haber/yeni">Yeni haber</Link>
      </div>
      <div className="section-hint">
        Buradan yazılan haberler yalnız Teleskor'da (uygulama ve www.teleskor.com.tr) yayınlanır.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {([["liste", "Haberler"], ["eslesmeyen", "Eşleşmeyen bağlantılar"], ["aktarim", "ScoresTV'den aktar"]] as [Sekme, string][])
          .map(([s, ad]) => (
            <button key={s} className={`btn ${sekme === s ? "btn-primary" : ""}`} onClick={() => setSekme(s)}>{ad}</button>
          ))}
      </div>
      {sekme === "liste" && <HaberTablosu />}
      {sekme === "eslesmeyen" && <Eslesmeyenler />}
      {sekme === "aktarim" && <Aktarim />}
    </div>
  );
}

function HaberTablosu() {
  const [durum, setDurum] = useState("");
  const [q, setQ] = useState("");
  const [sayfa, setSayfa] = useState(0);
  const [veri, setVeri] = useState<Liste | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      setVeri(await apiTeleskorHaberler(durum, q, sayfa));
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Liste alınamadı.");
    }
  }, [durum, q, sayfa]);

  useEffect(() => {
    const t = setTimeout(() => void yukle(), 250);
    return () => clearTimeout(t);
  }, [yukle]);

  const sayfaSayisi = veri ? Math.max(1, Math.ceil(veri.toplam / 30)) : 1;

  return (
    <div className="card card-pad">
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <select className="select" style={{ maxWidth: 180 }} value={durum}
          onChange={(e) => { setDurum(e.target.value); setSayfa(0); }}>
          <option value="">Bütün durumlar</option>
          {Object.entries(DURUM_ADI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="input" style={{ maxWidth: 320 }} value={q} placeholder="Başlıkta ara"
          onChange={(e) => { setQ(e.target.value); setSayfa(0); }} />
        {veri && <span className="muted" style={{ alignSelf: "center", fontSize: 13 }}>{veri.toplam} haber</span>}
      </div>
      {hata && <div className="alert alert-error">{hata}</div>}
      <div className="table-wrap"><table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 64 }}></th>
            <th>Başlık</th>
            <th>Durum</th>
            <th>Kategori</th>
            <th>Yayın</th>
            <th style={{ textAlign: "right" }}>Okunma</th>
          </tr>
        </thead>
        <tbody>
          {veri?.satirlar.map((h) => (
            <tr key={h.id}>
              <td>{h.kapakAdres ? <img src={h.kapakAdres} alt="" width={56} height={32} style={{ objectFit: "cover", borderRadius: 4 }} /> : null}</td>
              <td>
                <Link href={`/teleskor/haber/${h.id}`}>{h.baslik}</Link>
                <div className="muted" style={{ fontSize: 12 }}>
                  {[h.sonDakika && "Son dakika", h.oneCikan && "Öne çıkan", h.slider && "Slider",
                    h.eskiKaynak && "ScoresTV'den"].filter(Boolean).join(" · ")}
                </div>
              </td>
              <td>{DURUM_ADI[h.durum] ?? h.durum}</td>
              <td>{CATEGORY_LABELS[h.kategori as NewsCategory] ?? h.kategori}</td>
              <td style={{ whiteSpace: "nowrap" }}>{h.yayinAni ? new Date(h.yayinAni).toLocaleString("tr-TR") : "-"}</td>
              <td style={{ textAlign: "right" }}>{h.goruntulenme.toLocaleString("tr-TR")}</td>
            </tr>
          ))}
          {veri && veri.satirlar.length === 0 && (
            <tr><td colSpan={6} className="muted">Haber yok.</td></tr>
          )}
        </tbody>
      </table></div>
      {sayfaSayisi > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
          <button className="btn btn-sm" disabled={sayfa === 0} onClick={() => setSayfa(sayfa - 1)}>Önceki</button>
          <span className="muted" style={{ fontSize: 13 }}>{sayfa + 1} / {sayfaSayisi}</span>
          <button className="btn btn-sm" disabled={sayfa + 1 >= sayfaSayisi} onClick={() => setSayfa(sayfa + 1)}>Sonraki</button>
        </div>
      )}
    </div>
  );
}

function Eslesmeyenler() {
  const [liste, setListe] = useState<TeleskorHaberEslesmeyen[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const yukle = useCallback(async () => {
    try {
      setListe(await apiTeleskorHaberEslesmeyen());
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Liste alınamadı.");
    }
  }, []);
  useEffect(() => { void yukle(); }, [yukle]);

  return (
    <div className="card card-pad">
      <div className="section-hint">
        ScoresTV'den taşınan haberlerde bizim kataloğumuzla eşleşmeyen bağlantılar. Haberi açıp
        Bağlantılar bölümünden doğru kaydı ekleyin, sonra satırı "Tamam" ile kaldırın.
      </div>
      {hata && <div className="alert alert-error">{hata}</div>}
      <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Haber</th><th>Tür</th><th>ScoresTV'deki ad</th><th>Ülke</th><th></th></tr></thead>
        <tbody>
          {liste?.map((e) => (
            <tr key={`${e.haber_id}-${e.tur}-${e.eski_id}`}>
              <td><Link href={`/teleskor/haber/${e.haber_id}`}>{e.baslik}</Link></td>
              <td>{e.tur === "TAKIM" ? "Takım" : e.tur === "LIG" ? "Lig" : "Oyuncu"}</td>
              <td>{e.ad}</td>
              <td className="muted">{e.ulke ?? ""}</td>
              <td>
                <button className="btn btn-sm" onClick={async () => {
                  await apiTeleskorHaberEslesmeyenKaldir(e.haber_id, e.tur, e.eski_id);
                  void yukle();
                }}>Tamam</button>
              </td>
            </tr>
          ))}
          {liste && liste.length === 0 && <tr><td colSpan={5} className="muted">Eşleşmeyen bağlantı yok.</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
}

function Aktarim() {
  const [dosya, setDosya] = useState<File | null>(null);
  const [durum, setDurum] = useState<TeleskorHaberAktarimDurumu | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const zamanlayici = useRef<ReturnType<typeof setInterval> | null>(null);

  const yokla = useCallback(async () => {
    try {
      const d = await apiTeleskorHaberAktarimDurumu();
      setDurum(d);
      if (d.asama !== "CALISIYOR" && zamanlayici.current) {
        clearInterval(zamanlayici.current);
        zamanlayici.current = null;
      }
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Durum alınamadı.");
    }
  }, []);

  useEffect(() => {
    void yokla();
    return () => { if (zamanlayici.current) clearInterval(zamanlayici.current); };
  }, [yokla]);

  const baslat = async (dene: boolean) => {
    if (!dosya) return;
    if (!dene && !window.confirm("Haberler Teleskor'a yazılacak ve görseller taşınacak. Devam edilsin mi?")) return;
    setHata(null);
    try {
      setDurum(await apiTeleskorHaberAktar(dosya, dene));
      if (zamanlayici.current) clearInterval(zamanlayici.current);
      zamanlayici.current = setInterval(() => void yokla(), 2000);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Başlatılamadı.");
    }
  };

  const r = durum?.rapor;
  return (
    <div className="card card-pad">
      <div className="section-hint">
        ScoresTV veritabanından alınan dışa aktarma dosyasını (haber-aktarim.tgz) seçin. Önce
        "Dene" ile rapora bakın (hiçbir şey yazılmaz); sonra "Aktar". Yeniden çalıştırmak güvenli:
        taşınmış haber atlanır.
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", margin: "10px 0" }}>
        <input type="file" accept=".tgz,.gz,application/gzip" onChange={(e) => setDosya(e.target.files?.[0] ?? null)} />
        <button className="btn" disabled={!dosya || durum?.asama === "CALISIYOR"} onClick={() => void baslat(true)}>Dene</button>
        <button className="btn btn-primary" disabled={!dosya || durum?.asama === "CALISIYOR"} onClick={() => void baslat(false)}>Aktar</button>
      </div>
      {hata && <div className="alert alert-error">{hata}</div>}
      {durum && durum.asama !== "BOS" && (
        <div>
          <div style={{ marginBottom: 8 }}>
            <b>{durum.deneme ? "Deneme" : "Aktarım"}:</b>{" "}
            {durum.asama === "CALISIYOR" ? `sürüyor (${durum.islenen}/${durum.toplam})`
              : durum.asama === "BITTI" ? "bitti" : `durdu: ${durum.hata ?? ""}`}
          </div>
          {r && (
            <div className="table-wrap"><table className="data-table" style={{ fontSize: 14 }}>
              <tbody>
                <tr><td>{durum.deneme ? "Aktarılacak" : "Aktarılan"}</td><td>{r.aktarilacak ?? r.aktarilan ?? 0}</td></tr>
                <tr><td>Atlanan</td><td>{Object.entries(r.atlanan).map(([k, v]) => `${k === "NEWSDATA" ? "otomatik çekilmiş" : k === "ZATEN_VAR" ? "zaten taşınmış" : k}: ${v}`).join(", ") || "0"}</td></tr>
                <tr><td>Eşleşen bağlantı</td><td>{Object.entries(r.eslesenBaglanti).map(([k, v]) => `${k}: ${v}`).join(", ") || "0"}</td></tr>
                <tr><td>Eşleşmeyen bağlantı</td><td>{Object.entries(r.eslesmeyenBaglanti).map(([k, v]) => `${k}: ${v}`).join(", ") || "0"}</td></tr>
                <tr><td>Görsel</td><td>
                  kapak {r.gorsel.kapakTasinan ?? "-"} / {r.gorsel.kapak}, metin içi {r.gorsel.metinIciTasinan ?? "-"} / {r.gorsel.metinIci}
                </td></tr>
              </tbody>
            </table></div>
          )}
          {r && r.hatalar.length > 0 && (
            <div className="alert alert-error"><b>Hatalar</b><ul>{r.hatalar.map((h) => <li key={h}>{h}</li>)}</ul></div>
          )}
          {r && r.notlar.length > 0 && (
            <details><summary>Notlar ({r.notlar.length})</summary><ul>{r.notlar.map((n) => <li key={n}>{n}</li>)}</ul></details>
          )}
          {r && Object.keys(r.eslesmeyenler).length > 0 && (
            <details><summary>Eşleşmeyen adlar</summary>
              {Object.entries(r.eslesmeyenler).map(([tur, adlar]) => (
                <div key={tur}><b>{tur}</b>: {adlar.join(", ")}</div>
              ))}
            </details>
          )}
        </div>
      )}
    </div>
  );
}
