"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Smartphone,
  BellRing,
  Gamepad2,
  Globe2,
  RefreshCw,
} from "lucide-react";
import { apiAppStats, ApiError } from "@/lib/api-client";
import type { AppStats } from "@/lib/types";
import { formatCount } from "@/lib/format";

/**
 * "Uygulama İstatistikleri" — üye / cihaz / oyun KPI'ları (kendi DB'mizden,
 * kesin + gecikmesiz). Firebase Analytics'e ek olarak iş metrikleri için.
 * Dashboard'un üstünde kendi başlığıyla render edilir.
 */
export default function AppStatsSection() {
  const [data, setData] = useState<AppStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setData(await apiAppStats());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "İstatistikler alınamadı.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Uygulama İstatistikleri</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Üye, cihaz ve oyun metrikleri — canlı veritabanından
          </div>
        </div>
        <button
          className="btn"
          onClick={() => load(true)}
          disabled={refreshing || loading}
          title="Yenile"
        >
          <RefreshCw size={16} className={refreshing ? "spin" : ""} />
          Yenile
        </button>
      </div>

      {loading ? (
        <div className="card card-pad">
          <div className="muted">Yükleniyor…</div>
        </div>
      ) : error || !data ? (
        <div className="card card-pad">
          <div className="alert alert-error">{error ?? "Veri yok."}</div>
          <button className="btn" style={{ marginTop: 12 }} onClick={() => load()}>
            <RefreshCw size={16} /> Tekrar dene
          </button>
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <Kpi
              icon={<Users size={22} />}
              tone="brand"
              label="Toplam Üye"
              value={data.usersTotal}
              hint={`Son 7g +${formatCount(data.usersNew7d)} • 24s +${formatCount(
                data.usersNew24h,
              )}`}
            />
            <Kpi
              icon={<Smartphone size={22} />}
              tone="neutral"
              label="Aktif Cihaz (30g)"
              value={data.devicesActive30d}
              hint={`Toplam ${formatCount(data.devicesTotal)} • 7g ${formatCount(
                data.devicesActive7d,
              )}`}
            />
            <Kpi
              icon={<BellRing size={22} />}
              tone="warning"
              label="Bildirim Açık"
              value={data.devicesNotifOn}
              hint={`${formatCount(data.devicesLinked)} cihaz hesaba bağlı`}
            />
            <Kpi
              icon={<Gamepad2 size={22} />}
              tone="success"
              label="Oyun Tahmini"
              value={data.gamePicksTotal}
              hint={`${formatCount(data.gamePlayers)} oyuncu`}
            />
          </div>

          <div className="dash-2col">
            <div className="card card-pad">
              <div className="dash-head">
                <Users size={16} />
                <span>Üye Kaynağı</span>
              </div>
              <table className="mini-table">
                <tbody>
                  <Row label="Google ile" value={data.usersGoogle} />
                  <Row label="Apple ile" value={data.usersApple} />
                  <Row label="E-posta" value={data.usersEmail} />
                  <Row label="Son 30 günde yeni" value={data.usersNew30d} />
                </tbody>
              </table>
            </div>

            <div className="card card-pad">
              <div className="dash-head">
                <Smartphone size={16} />
                <span>Cihaz Dağılımı</span>
              </div>
              <table className="mini-table">
                <tbody>
                  <Row label="Android" value={data.devicesAndroid} />
                  <Row label="iOS" value={data.devicesIos} />
                  <Row label="Hesaba bağlı" value={data.devicesLinked} />
                  <Row label="Bildirim açık" value={data.devicesNotifOn} />
                </tbody>
              </table>
            </div>
          </div>

          <div className="card card-pad">
            <div className="dash-head">
              <Globe2 size={16} />
              <span>En Çok Cihaz — Ülkeler</span>
            </div>
            {data.topCountries.length === 0 ? (
              <div className="muted" style={{ padding: "8px 0" }}>
                Henüz ülke verisi yok.
              </div>
            ) : (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Ülke</th>
                    <th style={{ textAlign: "right" }}>Cihaz</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCountries.map((c) => (
                    <tr key={c.country}>
                      <td>{c.country?.toUpperCase() || "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        {formatCount(c.count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <tr>
      <td>{label}</td>
      <td style={{ textAlign: "right" }}>{formatCount(value)}</td>
    </tr>
  );
}

function Kpi({
  icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  tone: "brand" | "success" | "warning" | "neutral";
  label: string;
  value: number;
  hint?: string;
}) {
  const iconClass = tone === "brand" ? "stat-icon" : `stat-icon ${tone}`;
  return (
    <div className="stat-card">
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{formatCount(value)}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
      <div className={iconClass}>{icon}</div>
    </div>
  );
}
