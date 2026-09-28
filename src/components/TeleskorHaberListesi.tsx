"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ApiError,
  apiTeleskorHaberler,
} from "@/lib/api-client";
import { CATEGORY_LABELS } from "@/lib/labels";
import type {
  NewsCategory,
  TeleskorHaberListesi as Liste,
} from "@/lib/types";

/**
 * TELESKOR → HABERLER: haber listesi.
 */

const DURUM_ADI: Record<string, string> = {
  TASLAK: "Taslak",
  ZAMANLI: "Zamanlanmış",
  YAYINDA: "Yayında",
  ARSIV: "Arşiv",
};

export default function TeleskorHaberListesi() {
  return (
    <div className="stack">
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Teleskor Haberleri</h1>
        <Link className="btn btn-primary" href="/teleskor/haber/yeni">Yeni haber</Link>
      </div>
      <div className="section-hint">
        Buradan yazılan haberler yalnız Teleskor'da (uygulama ve www.teleskor.com.tr) yayınlanır.
      </div>
      <HaberTablosu />
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
                    h.eskiKaynak && "eski sistemden"].filter(Boolean).join(" · ")}
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
