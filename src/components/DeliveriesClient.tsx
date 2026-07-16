"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiListDeliveries, apiDeliverySummary } from "@/lib/api-client";
import type {
  NotificationDelivery,
  NotificationDeliverySummary,
  NotificationOutboxStatus,
} from "@/lib/types";

const STATUS_TR: Record<NotificationOutboxStatus, string> = {
  PENDING: "Sırada",
  SENT: "Gönderildi",
  FAILED: "Başarısız",
};

const TYPE_TR: Record<string, string> = {
  gol: "Gol",
  kirmizi: "Kırmızı Kart",
  penalti: "Penaltı",
  basladi: "Başladı",
  bitti: "Bitti",
  ht: "İlk Yarı",
  "2yari": "İkinci Yarı",
  kadro: "Kadro",
};

type Filter = "" | NotificationOutboxStatus;

export default function DeliveriesClient() {
  const [rows, setRows] = useState<NotificationDelivery[]>([]);
  const [summary, setSummary] = useState<NotificationDeliverySummary | null>(null);
  const [filter, setFilter] = useState<Filter>("");
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, sum] = await Promise.all([
        apiListDeliveries(filter, 100),
        apiDeliverySummary(),
      ]);
      setRows(list);
      setSummary(sum);
    } catch {
      // sessiz geç — sonraki poll'da tekrar dener
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    load();
    // Canlı maç sırasında yeni gönderimler için ~8 sn'de bir tazele.
    pollRef.current = setInterval(load, 8000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Bildirim Gönderimleri</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Maç olaylarının (gol, kart, başladı/bitti, ilk/ikinci yarı, kadro)
            push teslim durumu. Mod: TOKEN (cihaz token’ı), TOPIC (FCM konu
            fan-out), DUAL (ikisi birden — geçiş dönemi).
          </div>
        </div>
        <button className="btn" onClick={load}>
          Yenile
        </button>
      </div>

      {summary && (
        <div className="dlv-summary">
          <button
            className={`dlv-stat ${filter === "" ? "active" : ""}`}
            onClick={() => setFilter("")}
          >
            <span className="dlv-stat-num">
              {summary.pending + summary.sent + summary.failed}
            </span>
            <span className="dlv-stat-label">Tümü</span>
          </button>
          <button
            className={`dlv-stat ok ${filter === "SENT" ? "active" : ""}`}
            onClick={() => setFilter("SENT")}
          >
            <span className="dlv-stat-num">{summary.sent}</span>
            <span className="dlv-stat-label">Gönderildi</span>
          </button>
          <button
            className={`dlv-stat warn ${filter === "PENDING" ? "active" : ""}`}
            onClick={() => setFilter("PENDING")}
          >
            <span className="dlv-stat-num">{summary.pending}</span>
            <span className="dlv-stat-label">Sırada</span>
          </button>
          <button
            className={`dlv-stat err ${filter === "FAILED" ? "active" : ""}`}
            onClick={() => setFilter("FAILED")}
          >
            <span className="dlv-stat-num">{summary.failed}</span>
            <span className="dlv-stat-label">Başarısız</span>
          </button>
        </div>
      )}

      <div className="card card-pad">
        {loading ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Yükleniyor…
          </div>
        ) : rows.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Kayıt yok.
          </div>
        ) : (
          <div className="bc-history">
            {rows.map((r) => (
              <div className="bc-row" key={r.id}>
                <div className="bc-main">
                  <div className="bc-title">
                    {r.title}
                    {r.silent && (
                      <span className="dlv-tag dlv-tag-muted">sessiz</span>
                    )}
                  </div>
                  <div className="bc-body">{r.body}</div>
                  <div className="dlv-sub">
                    <span className="dlv-tag">
                      {TYPE_TR[r.notifType] ?? r.notifType}
                    </span>
                    <span className="dlv-sub-item">Maç #{r.fixtureId}</span>
                    {r.lastError && (
                      <span className="dlv-sub-item dlv-err-text">
                        {r.lastError}
                      </span>
                    )}
                  </div>
                </div>
                <div className="bc-meta">
                  <div className="bc-badges">
                    <span
                      className={`bc-badge bc-status bc-status-${r.status.toLowerCase()}`}
                    >
                      {STATUS_TR[r.status]}
                    </span>
                    {r.sendMode && (
                      <span className="bc-badge">{r.sendMode}</span>
                    )}
                  </div>
                  <div className="bc-count">
                    {r.status === "SENT"
                      ? r.sendMode === "TOPIC"
                        ? "topic fan-out"
                        : `${r.deliveredCount ?? 0} / ${r.recipients ?? 0} cihaz`
                      : r.status === "FAILED"
                        ? `${r.attempts} deneme`
                        : "sırada"}
                  </div>
                  <div className="bc-date">
                    {new Date(r.sentAt ?? r.createdAt).toLocaleString("tr-TR")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
