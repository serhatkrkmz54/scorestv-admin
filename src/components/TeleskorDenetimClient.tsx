"use client";

import { useCallback, useEffect, useState } from "react";
import { apiDenetimListe, apiDenetimDogrula, ApiError } from "@/lib/api-client";
import type { DenetimSatiri, DenetimZinciri } from "@/lib/types";
import { formatDate } from "@/lib/format";
import {
  ayrintiYaz,
  BILINMEYEN_IP,
  DIGER_OLAYLAR,
  konuYaz,
  OLAY_TR,
  sistemSatiri,
  YONETICI_OLAYLARI,
} from "@/lib/denetim";

/**
 * DENETİM KAYDI — "kim, ne zaman, ne yaptı".
 *
 * <h3>Neden bu ekran gerekliydi</h3>
 * Panelden yapılan her yönetici işlemi (rol değişikliği, Telepuan verme,
 * sipariş iptali, üye düzenleme) gerekçesiyle birlikte denetim kaydına
 * yazılıyor — ama okunacak bir yer yoktu. Yazıp okunamaz bırakmak, kaydı
 * hiç tutmamaktan yalnızca biraz iyidir.
 *
 * <h3>Zincir doğrulaması</h3>
 * Her kayıt bir öncekinin SHA-256 özetini taşıyor. "Doğrula" düğmesi
 * zinciri baştan sona kontrol ediyor; {@code intact: false} kayıtların
 * sonradan değiştirildiği anlamına geliyor. Mahkemeye sunulacak bir
 * dökümün yanında bu çıktı da bulunmalı.
 *
 * <h3>Bu sayfanın kendisi de kayda geçiyor</h3>
 * Teleskor, denetim kaydını görüntülemeyi {@code AUDIT_LOG_VIEWED} olarak
 * yazıyor ("denetimin denetimi"). Yani her arama bir satır bırakıyor —
 * listede kendi izlerini görmek beklenen davranış, hata değil.
 */

export default function TeleskorDenetimClient() {
  const [satirlar, setSatirlar] = useState<DenetimSatiri[]>([]);
  const [toplam, setToplam] = useState(0);
  const [sayfa, setSayfa] = useState(0);
  const [olay, setOlay] = useState("");
  const [kullaniciId, setKullaniciId] = useState("");
  const [uygulanan, setUygulanan] = useState({ event: "", userId: "" });
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [zincir, setZincir] = useState<DenetimZinciri | null>(null);
  const [dogruluyor, setDogruluyor] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await apiDenetimListe({
        event: uygulanan.event || undefined,
        userId: uygulanan.userId || undefined,
        page: sayfa,
        size: 50,
      });
      setSatirlar(p.content);
      setToplam(p.totalElements);
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Kayıtlar alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [uygulanan, sayfa]);

  useEffect(() => {
    load();
  }, [load]);

  async function dogrula() {
    setDogruluyor(true);
    try {
      setZincir(await apiDenetimDogrula());
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Zincir doğrulanamadı.");
    } finally {
      setDogruluyor(false);
    }
  }

  function uygula() {
    setSayfa(0);
    setUygulanan({ event: olay, userId: kullaniciId.trim() });
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Denetim Kaydı</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Panelden yapılan her yönetici işlemi gerekçesiyle burada.{" "}
            <b>Bu sayfayı açmak da kayda geçiyor</b> — listede kendi izlerini
            görmen beklenen davranış.
          </div>
        </div>
        <button className="btn" disabled={dogruluyor} onClick={dogrula}>
          {dogruluyor ? "Doğrulanıyor…" : "Zinciri doğrula"}
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      {zincir && (
        <div className={`alert ${zincir.intact ? "alert-success" : "alert-error"}`}>
          {zincir.intact ? (
            <>
              <b>Zincir sağlam.</b> {zincir.checkedEntries} kayıt kontrol
              edildi (toplam {zincir.totalEverWritten} yazılmış).{" "}
              {formatDate(zincir.verifiedAt)}
            </>
          ) : (
            <>
              <b>ZİNCİR BOZUK — kayıtlar sonradan değiştirilmiş olabilir.</b>
              <ul style={{ margin: "6px 0 0 18px" }}>
                {zincir.problems.slice(0, 10).map((p, i) => (
                  <li key={i} style={{ fontSize: 12.5 }}>
                    {p}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="card card-pad">
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <select
            className="input"
            style={{ maxWidth: 280 }}
            value={olay}
            onChange={(e) => setOlay(e.target.value)}
          >
            <option value="">Tüm olaylar</option>
            <optgroup label="Yönetici işlemleri">
              {YONETICI_OLAYLARI.map((k) => (
                <option key={k} value={k}>
                  {OLAY_TR[k]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Kullanıcı hareketleri">
              {DIGER_OLAYLAR.map((k) => (
                <option key={k} value={k}>
                  {OLAY_TR[k]}
                </option>
              ))}
            </optgroup>
          </select>
          <input
            className="input"
            style={{ maxWidth: 180 }}
            value={kullaniciId}
            onChange={(e) => setKullaniciId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") uygula();
            }}
            placeholder="Hesap no (#)"
          />
          <button className="btn btn-sm" onClick={uygula}>
            Süz
          </button>
          {(uygulanan.event || uygulanan.userId) && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setOlay("");
                setKullaniciId("");
                setSayfa(0);
                setUygulanan({ event: "", userId: "" });
              }}
            >
              Temizle
            </button>
          )}
          <div style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 12.5 }}>
            {toplam} kayıt
          </span>
        </div>

        {loading ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Yükleniyor…
          </div>
        ) : satirlar.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Kayıt yok.
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 150 }}>Zaman</th>
                    <th>Olay</th>
                    <th style={{ width: 150 }}>Hedef</th>
                    <th style={{ width: 130 }}>Yapan</th>
                    <th>Ayrıntı</th>
                    <th style={{ width: 120 }}>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {satirlar.map((s) => {
                    const sistem = sistemSatiri(s);
                    const konu = s.subject && s.subject !== s.userName ? konuYaz(s.subject) : null;
                    return (
                    <tr key={s.id}>
                      <td style={{ fontSize: 12.5 }}>{formatDate(s.occurredAt)}</td>
                      <td style={{ fontSize: 12.5 }}>
                        <div style={{ fontWeight: 600 }}>
                          {OLAY_TR[s.event] ?? s.event}
                        </div>
                        {s.outcome !== "SUCCESS" && (
                          <span className="badge badge-archived">{s.outcome === "FAILURE" ? "Başarısız" : s.outcome}</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12.5, wordBreak: "break-word" }}>
                        {s.userId != null ? (
                          <>
                            <b>{s.userName ?? `Hesap #${s.userId}`}</b>
                            {s.userName && (
                              <span className="muted" style={{ fontSize: 11.5 }}> #{s.userId}</span>
                            )}
                          </>
                        ) : !konu ? (
                          "—"
                        ) : null}
                        {konu && (
                          <div className={s.userId != null ? "muted" : undefined} style={{ fontSize: s.userId != null ? 11.5 : 12.5 }}>
                            {konu}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12.5 }}>
                        {s.actorUserId != null ? (
                          <>
                            <b>{s.actorName ?? `Hesap #${s.actorUserId}`}</b>
                            {s.actorName && (
                              <span className="muted" style={{ fontSize: 11.5 }}> #{s.actorUserId}</span>
                            )}
                          </>
                        ) : sistem ? (
                          <span className="badge" style={{ whiteSpace: "nowrap" }}>Sistem (otomatik)</span>
                        ) : s.userId != null ? (
                          <span className="muted">Kullanıcının kendisi</span>
                        ) : (
                          <span className="muted">Oturumsuz istek</span>
                        )}
                      </td>
                      <td
                        style={{
                          fontSize: 12.5,
                          maxWidth: 320,
                          wordBreak: "break-word",
                        }}
                      >
                        {ayrintiYaz(s.detail)}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {s.ipAddress == null || s.ipAddress === BILINMEYEN_IP ? (
                          <span className="muted">{sistem ? "Sunucu" : "—"}</span>
                        ) : (
                          s.ipAddress
                        )}
                        {s.country && (
                          <div className="muted" style={{ fontSize: 11.5 }}>
                            {s.country}
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
                alignItems: "center",
              }}
            >
              <button
                className="btn btn-sm"
                disabled={sayfa === 0}
                onClick={() => setSayfa((s) => Math.max(0, s - 1))}
              >
                Önceki
              </button>
              <span className="muted" style={{ fontSize: 12.5 }}>
                Sayfa {sayfa + 1}
              </span>
              <button
                className="btn btn-sm"
                disabled={(sayfa + 1) * 50 >= toplam}
                onClick={() => setSayfa((s) => s + 1)}
              >
                Sonraki
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
