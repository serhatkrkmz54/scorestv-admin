"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiTeleskorModerasyon, ApiError } from "@/lib/api-client";
import type { TeleskorModerasyonOzeti, TeleskorOrderStatus } from "@/lib/types";
import { formatDate } from "@/lib/format";
import Zaman from "@/components/Zaman";
import { DESTEK_DURUM_TR, destekDurumRozeti } from "@/components/TeleskorDestekClient";
import { SIPARIS_DURUM_TR } from "@/components/TeleskorOrdersClient";

/**
 * Üye kartının "Moderasyon ve içerik" bölümü: içeriğine gelen şikayetler,
 * yöneticinin sildiği içerikleri, kendi şikayetleri, susturma geçmişi,
 * destek talepleri ve market siparişleri. Talep ve siparişlerden ilgili
 * sayfaya geçilir (talep doğrudan açılır, siparişler bu üyeye süzülür).
 */
export default function TeleskorModerasyon({ userId }: { userId: number }) {
  const [v, setV] = useState<TeleskorModerasyonOzeti | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    apiTeleskorModerasyon(userId)
      .then((d) => !iptal && setV(d))
      .catch((e) => !iptal && setHata(e instanceof ApiError ? e.message : "Moderasyon özeti alınamadı."));
    return () => {
      iptal = true;
    };
  }, [userId]);

  const sikayetToplam = v
    ? v.gonderiSikayeti.toplam + v.yorumSikayeti.toplam + v.sohbetSikayeti.toplam
    : 0;
  const sikayetBekleyen = v
    ? v.gonderiSikayeti.bekleyen + v.yorumSikayeti.bekleyen + v.sohbetSikayeti.bekleyen
    : 0;
  const silinen = v ? v.silinenGonderi + v.silinenYorum + v.silinenSohbet : 0;

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>
        Moderasyon ve içerik
      </div>
      {hata ? (
        <div className="alert alert-error">{hata}</div>
      ) : !v ? (
        <div className="muted" style={{ fontSize: 13 }}>
          Yükleniyor…
        </div>
      ) : (
        <>
          <div
            className="stat-grid"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}
          >
            <div className="stat-card" style={{ padding: "14px 16px" }}>
              <div>
              <div className="stat-value">{sikayetToplam}</div>
              <div className="stat-label">İçeriği şikayet edildi</div>
              <div className="stat-hint">
                {sikayetBekleyen > 0 ? `${sikayetBekleyen} bekliyor · ` : ""}
                gönderi {v.gonderiSikayeti.toplam} · yorum {v.yorumSikayeti.toplam} · sohbet{" "}
                {v.sohbetSikayeti.toplam}
              </div>
              {sikayetBekleyen > 0 && (
                <div className="stat-hint">
                  <Link href="/teleskor/akis">Akış şikayetleri</Link> ·{" "}
                  <Link href="/teleskor/sohbet">Sohbet şikayetleri</Link>
                </div>
              )}
              </div>
            </div>
            <div className="stat-card" style={{ padding: "14px 16px" }}>
              <div>
              <div className="stat-value">{silinen}</div>
              <div className="stat-label">Yönetici sildi</div>
              <div className="stat-hint">
                gönderi {v.silinenGonderi} · yorum {v.silinenYorum} · sohbet {v.silinenSohbet}
              </div>
              </div>
            </div>
            <div className="stat-card" style={{ padding: "14px 16px" }}>
              <div>
              <div className="stat-value">{v.sikayetEttigi}</div>
              <div className="stat-label">Kendisinin şikayeti</div>
              </div>
            </div>
            <div className="stat-card" style={{ padding: "14px 16px" }}>
              <div>
              <div className="stat-value">{v.destek.toplam}</div>
              <div className="stat-label">Destek talebi</div>
              <div className="stat-hint">{v.destek.bekleyen} açık</div>
              </div>
            </div>
            <div className="stat-card" style={{ padding: "14px 16px" }}>
              <div>
              <div className="stat-value">{v.siparis.toplam}</div>
              <div className="stat-label">Market siparişi</div>
              <div className="stat-hint">
                {v.siparis.bekleyen} hazırlanıyor · {v.harcananPuan} TP harcadı
              </div>
              {v.siparis.toplam > 0 && (
                <div className="stat-hint">
                  <Link href={`/teleskor/market/siparisler?kullanici=${userId}`}>
                    Siparişlerini aç
                  </Link>
                </div>
              )}
              </div>
            </div>
          </div>

          {v.susturmalar.length > 0 && (
            <>
              <div className="label" style={{ marginTop: 12 }}>
                Susturma geçmişi
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <tbody>
                    {v.susturmalar.map((s, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 12.5, width: 140 }}>
                          <Zaman iso={s.zaman} />
                        </td>
                        <td style={{ fontSize: 12.5, width: 120 }}>
                          <b>{s.yapan ?? "—"}</b>
                        </td>
                        <td style={{ fontSize: 12.5, wordBreak: "break-word" }}>{s.ayrinti ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {v.sonTalepler.length > 0 && (
            <>
              <div className="label" style={{ marginTop: 12 }}>
                Son destek talepleri
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <tbody>
                    {v.sonTalepler.map((t) => (
                      <tr key={t.id}>
                        <td style={{ fontSize: 12.5 }}>
                          <Link href={`/teleskor/destek?talep=${t.id}`}>
                            {t.konu || `Talep #${t.id}`}
                          </Link>
                        </td>
                        <td style={{ fontSize: 12.5, width: 110 }}>
                          <span className={`badge ${destekDurumRozeti(t.durum)}`}>
                            {DESTEK_DURUM_TR[t.durum] ?? t.durum}
                          </span>
                        </td>
                        <td style={{ fontSize: 12.5, width: 140 }}>
                          <Zaman iso={t.sonMesaj} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {v.sonSiparisler.length > 0 && (
            <>
              <div className="label" style={{ marginTop: 12 }}>
                Son siparişler
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <tbody>
                    {v.sonSiparisler.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontSize: 12.5 }}>{s.urun ?? `Sipariş #${s.id}`}</td>
                        <td style={{ fontSize: 12.5, width: 80 }}>{s.puan} TP</td>
                        <td style={{ fontSize: 12.5, width: 120 }}>
                          {SIPARIS_DURUM_TR[s.durum as TeleskorOrderStatus] ?? s.durum}
                        </td>
                        <td style={{ fontSize: 12.5, width: 140 }}>{formatDate(s.tarih)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
