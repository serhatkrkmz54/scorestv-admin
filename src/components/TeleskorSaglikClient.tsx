"use client";

import { useCallback, useEffect, useState } from "react";
import { apiTeleskorSaglik, ApiError } from "@/lib/api-client";
import type { SaglikOzeti } from "@/lib/types";

/**
 * SİSTEM SAĞLIĞI — "bir şey mi bozuldu" sorusunun tek bakışta cevabı.
 *
 * <h3>Üç ayrı rapor, üç ayrı soru</h3>
 * <ol>
 *   <li><b>Motor durumu:</b> ürün motora ulaşabiliyor mu, devre kesik mi.
 *       Skorlar gelmiyorsa ilk bakılacak yer.</li>
 *   <li><b>Motor kullanımı:</b> önbellek isabet oranı. Düşükse süreler
 *       yanlış ayarlanmış demektir ve motora gereksiz istek gidiyor.</li>
 *   <li><b>Veritabanı yükü:</b> uç başına sorgu sayısı. Ortalama yükselen
 *       bir uç, araya girmiş bir döngünün (N+1) ilk işareti.</li>
 * </ol>
 *
 * <h3>SALT OKUNUR</h3>
 * Sayaç sıfırlama uçları BİLEREK bağlanmadı. Sıfırlama bir ölçüm aracı
 * ("sıfırla, akışı koştur, raporu al") ve panelden yanlışlıkla basılması,
 * o sırada süren bir ölçümü sessizce bozardı. Gerektiğinde Bruno'dan.
 */
export default function TeleskorSaglikClient() {
  const [veri, setVeri] = useState<SaglikOzeti | null>(null);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVeri(await apiTeleskorSaglik());
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Rapor alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const motor = veri?.motorDurumu;
  const kullanim = veri?.motorKullanimi;
  const db = veri?.dbYuk;

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Teleskor — Sistem Sağlığı</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Salt okunur. Sayaçlar burada sıfırlanmıyor — sıfırlama bir ölçüm
            adımı ve yanlışlıkla basılması süren bir ölçümü bozardı.
          </div>
        </div>
        <button className="btn" disabled={loading} onClick={load}>
          {loading ? "Yükleniyor…" : "Yenile"}
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      {/* MOTOR DURUMU */}
      <div className="card card-pad">
        <div className="card-title">Motor bağlantısı</div>
        {!motor ? (
          <div className="muted" style={{ fontSize: 13 }}>
            {loading ? "Yükleniyor…" : "Alınamadı."}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span
                className={`badge ${
                  motor.durum === "SAĞLIKLI" ? "badge-published" : "badge-archived"
                }`}
              >
                {motor.durum}
              </span>
              <span className="muted" style={{ fontSize: 12.5 }}>
                {motor.adres ?? "adres tanımsız"} · {motor.yanitMs} ms
              </span>
            </div>
            {motor.hata && (
              <div className="alert alert-error" style={{ marginTop: 10 }}>
                {motor.hata}
              </div>
            )}
            {motor.devreKesik && (
              <div className="alert alert-error" style={{ marginTop: 10 }}>
                <b>Devre kesik.</b> Üst üste {motor.ustUsteHata} hata sonrası
                motora {motor.devreAcikKalmaSaniye} saniye boyunca hiç istek
                gitmiyor. Skorlar önbellekteki eski veriden servis ediliyor.
              </div>
            )}
          </>
        )}
      </div>

      {/* MOTOR KULLANIMI */}
      <div className="card card-pad">
        <div className="card-title">Motora giden istekler</div>
        {!kullanim ? (
          <div className="muted" style={{ fontSize: 13 }}>
            {loading ? "Yükleniyor…" : "Alınamadı."}
          </div>
        ) : (
          <>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
              {kullanim.toplamIstek} istek · {kullanim.toplamOnbellekIsabeti}{" "}
              önbellekten · <b>%{kullanim.onbellekIsabetOrani}</b> isabet ·
              son {Math.round(kullanim.olcumSaniye / 60)} dakika
              {kullanim.onbellekIsabetOrani < 80 && kullanim.toplamIstek > 50 && (
                <span style={{ color: "var(--danger, #dc2626)" }}>
                  {" "}
                  · isabet düşük, önbellek süreleri gözden geçirilmeli
                </span>
              )}
            </div>
            {kullanim.uclar.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>
                Henüz istek yok.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Uç</th>
                    <th style={{ textAlign: "right" }}>İstek</th>
                    <th style={{ textAlign: "right" }}>Önbellek</th>
                    <th style={{ textAlign: "right" }}>Bayat</th>
                    <th style={{ textAlign: "right" }}>Hata</th>
                    <th style={{ textAlign: "right" }}>Ort. ms</th>
                    <th style={{ textAlign: "right" }}>En yavaş</th>
                  </tr>
                </thead>
                <tbody>
                  {kullanim.uclar.map((u) => (
                    <tr key={u.path}>
                      <td style={{ fontSize: 12.5 }}>{u.path}</td>
                      <td style={{ textAlign: "right" }}>{u.calls}</td>
                      <td style={{ textAlign: "right" }}>{u.cacheHits}</td>
                      <td style={{ textAlign: "right" }}>{u.staleServed}</td>
                      <td
                        style={{
                          textAlign: "right",
                          color: u.failures > 0 ? "var(--danger, #dc2626)" : undefined,
                        }}
                      >
                        {u.failures}
                      </td>
                      <td style={{ textAlign: "right" }}>{u.avgMillis}</td>
                      <td style={{ textAlign: "right" }}>{u.maxMillis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* VERİTABANI YÜKÜ */}
      <div className="card card-pad">
        <div className="card-title">Veritabanı yükü</div>
        {!db ? (
          <div className="muted" style={{ fontSize: 13 }}>
            {loading ? "Yükleniyor…" : "Alınamadı (ölçüm kapalı olabilir)."}
          </div>
        ) : (
          <>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
              Toplam {db.totalQueries} sorgu · {db.userQueries} kullanıcı
              isteğinden · {db.systemQueries} gece görevlerinden.
              {" "}
              <b>Ortalaması yükselen bir uç</b>, araya girmiş bir döngünün
              (N+1) ilk işaretidir.
            </div>
            {db.operations.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>
                Henüz ölçüm yok.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>İşlem</th>
                    <th style={{ width: 90 }}>Kaynak</th>
                    <th style={{ textAlign: "right" }}>Çalışma</th>
                    <th style={{ textAlign: "right" }}>Ortalama</th>
                    <th style={{ textAlign: "right" }}>En az</th>
                    <th style={{ textAlign: "right" }}>En çok</th>
                    <th style={{ textAlign: "right" }}>Ort. ms</th>
                  </tr>
                </thead>
                <tbody>
                  {db.operations.map((o) => (
                    <tr key={`${o.source}:${o.operation}`}>
                      <td style={{ fontSize: 12.5 }}>{o.operation}</td>
                      <td style={{ fontSize: 12 }}>{o.source}</td>
                      <td style={{ textAlign: "right" }}>{o.executions}</td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: o.averageQueries > 25 ? 700 : 400,
                          color:
                            o.averageQueries > 25
                              ? "var(--danger, #dc2626)"
                              : undefined,
                        }}
                      >
                        {o.averageQueries.toFixed(1)}
                      </td>
                      <td style={{ textAlign: "right" }}>{o.minQueries}</td>
                      <td style={{ textAlign: "right" }}>{o.maxQueries}</td>
                      <td style={{ textAlign: "right" }}>
                        {o.averageMillis.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
