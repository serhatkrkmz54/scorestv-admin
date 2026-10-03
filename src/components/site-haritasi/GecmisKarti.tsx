"use client";

import { useCallback, useEffect, useState } from "react";
import { apiSiteHaritasiGecmis } from "@/lib/api-client";
import type { SiteHaritasiGecmis } from "@/lib/types";
import { hataMetni, tarih } from "./ortak";

/** Site haritası ayarlarındaki bütün değişiklikler: kim, ne zaman, önce → sonra (denetim kaydından). */
export default function GecmisKarti() {
  const [sayfa, setSayfa] = useState(0);
  const [veri, setVeri] = useState<SiteHaritasiGecmis | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  const yukle = useCallback(async (s: number) => {
    setMesgul(true);
    setHata(null);
    try {
      setVeri(await apiSiteHaritasiGecmis(s));
    } catch (e) {
      setHata(hataMetni(e, "Geçmiş alınamadı."));
    } finally {
      setMesgul(false);
    }
  }, []);

  useEffect(() => {
    void yukle(sayfa);
  }, [sayfa, yukle]);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Değişiklik geçmişi</div>
      </div>
      <div className="card-pad">
        {hata && <div className="alert alert-error">{hata}</div>}
        {veri && veri.satirlar.length === 0 && <div className="muted">Henüz değişiklik yok.</div>}
        {veri && veri.satirlar.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>Yapan</th>
                  <th>Değişiklik</th>
                </tr>
              </thead>
              <tbody>
                {veri.satirlar.map((s) => (
                  <tr key={s.id}>
                    <td className="cell-sub" style={{ whiteSpace: "nowrap" }}>{tarih(s.zaman)}</td>
                    <td>{s.yapan ?? "—"}</td>
                    <td className="sh-yol">{s.ayrinti ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="sh-dugmeler" style={{ marginTop: 12 }}>
          <button className="btn btn-sm" disabled={mesgul || sayfa === 0} onClick={() => setSayfa((s) => s - 1)}>
            Daha yeni
          </button>
          <button className="btn btn-sm" disabled={mesgul || !veri?.dahaVar} onClick={() => setSayfa((s) => s + 1)}>
            Daha eski
          </button>
        </div>
      </div>
    </div>
  );
}
