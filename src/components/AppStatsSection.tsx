"use client";

import { useEffect, useRef, useState } from "react";
import {
  Users,
  Smartphone,
  BellRing,
  Gamepad2,
  Globe2,
  RefreshCw,
  UserPlus,
  PieChart,
} from "lucide-react";
import { apiAppStats, ApiError } from "@/lib/api-client";
import type { AppStats } from "@/lib/types";
import { formatCount } from "@/lib/format";

/**
 * "Uygulama İstatistikleri" — üye / cihaz / oyun KPI'ları (kendi DB'mizden,
 * kesin + gecikmesiz). Firebase Analytics'e ek olarak iş metrikleri için.
 * Donut + yatay bar chart'larla görselleştirilir (Dashboard stiliyle aynı).
 */
export default function AppStatsSection() {
  const [data, setData] = useState<AppStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Yenilemede chart'ları yeniden mount edip animasyon + count-up'ı tetiklemek için.
  const [tick, setTick] = useState(0);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setData(await apiAppStats());
      setTick((t) => t + 1);
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
              idx={0}
              icon={<Users size={22} />}
              tone="brand"
              label="Toplam Üye"
              value={data.usersTotal}
              hint={`Son 7g +${formatCount(data.usersNew7d)} • 24s +${formatCount(
                data.usersNew24h,
              )}`}
            />
            <Kpi
              idx={1}
              icon={<Smartphone size={22} />}
              tone="neutral"
              label="Aktif Cihaz (30g)"
              value={data.devicesActive30d}
              hint={`Toplam ${formatCount(data.devicesTotal)} • 7g ${formatCount(
                data.devicesActive7d,
              )}`}
            />
            <Kpi
              idx={2}
              icon={<BellRing size={22} />}
              tone="warning"
              label="Bildirim Açık"
              value={data.devicesNotifOn}
              hint={`${formatCount(data.devicesLinked)} cihaz hesaba bağlı`}
            />
            <Kpi
              idx={3}
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
                <PieChart size={16} />
                <span>Üye Kaynağı</span>
              </div>
              <Donut
                key={`src${tick}`}
                total={data.usersTotal}
                unit="üye"
                segments={[
                  { label: "Google", value: data.usersGoogle, color: "var(--brand)" },
                  { label: "Apple", value: data.usersApple, color: "var(--neutral)" },
                  { label: "E-posta", value: data.usersEmail, color: "var(--warning)" },
                ]}
              />
            </div>

            <div className="card card-pad">
              <div className="dash-head">
                <Smartphone size={16} />
                <span>Cihaz Dağılımı</span>
              </div>
              <Donut
                key={`dev${tick}`}
                total={data.devicesTotal}
                unit="cihaz"
                segments={[
                  { label: "Android", value: data.devicesAndroid, color: "var(--success)" },
                  { label: "iOS", value: data.devicesIos, color: "var(--brand)" },
                ]}
              />
            </div>
          </div>

          <div className="dash-2col">
            <div className="card card-pad">
              <div className="dash-head">
                <UserPlus size={16} />
                <span>Yeni Üye — Dönem</span>
              </div>
              <BarChart
                key={`new${tick}`}
                tone="success"
                items={[
                  { label: "Son 24 saat", value: data.usersNew24h },
                  { label: "Son 7 gün", value: data.usersNew7d },
                  { label: "Son 30 gün", value: data.usersNew30d },
                ]}
              />
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
                <BarChart
                  key={`ctry${tick}`}
                  tone="brand"
                  items={data.topCountries.map((c) => ({
                    label: c.country?.toUpperCase() || "—",
                    value: c.count,
                  }))}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
// Animasyon yardımcıları (Dashboard ile aynı davranış)
// ───────────────────────────────────────────────────────────────────
function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setM(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return m;
}

function useCountUp(target: number, ms = 750): number {
  const [v, setV] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    const from = ref.current;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - t, 3);
      const val = Math.round(from + (target - from) * e);
      setV(val);
      ref.current = val;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

// ───────────────────────────────────────────────────────────────────
// Donut (Dashboard StatusDonut ile aynı görsel; merkez etiketi parametreli)
// ───────────────────────────────────────────────────────────────────
function Donut({
  segments,
  total,
  unit,
}: {
  segments: { label: string; value: number; color: string }[];
  total: number;
  unit: string;
}) {
  const mounted = useMounted();
  const count = useCountUp(total);
  const R = 52;
  const C = 2 * Math.PI * R;
  const cx = 70;
  const cy = 70;
  const sw = 20;
  const safeTotal = Math.max(1, total);

  let acc = 0;
  const arcs = segments.map((s) => {
    const len = (s.value / safeTotal) * C;
    const offset = -(acc / safeTotal) * C;
    acc += s.value;
    return { ...s, len, offset };
  });

  return (
    <div className="donut-wrap">
      <div className="donut-box">
        <svg viewBox="0 0 140 140" className="donut">
          <circle cx={cx} cy={cy} r={R} className="donut-track" strokeWidth={sw} fill="none" />
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {arcs.map((a, i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={R}
                fill="none"
                strokeWidth={sw}
                strokeLinecap="round"
                className="donut-seg"
                stroke={a.color}
                strokeDasharray={mounted ? `${Math.max(a.len - 2, 0)} ${C}` : `0 ${C}`}
                strokeDashoffset={a.offset}
                style={{ transitionDelay: `${i * 0.08}s` }}
              />
            ))}
          </g>
        </svg>
        <div className="donut-center">
          <div className="donut-total">{formatCount(count)}</div>
          <div className="donut-cap">{unit}</div>
        </div>
      </div>
      <div className="donut-legend">
        {segments.map((s) => (
          <div key={s.label} className="legend-row">
            <span className="legend-dot" style={{ background: s.color }} />
            <span className="legend-label">{s.label}</span>
            <span className="legend-val">{formatCount(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
// Yatay bar chart — mount'ta 0'dan hedefe animasyonlu dolar.
// ───────────────────────────────────────────────────────────────────
function BarChart({
  items,
  tone = "brand",
}: {
  items: { label: string; value: number }[];
  tone?: "brand" | "success";
}) {
  const mounted = useMounted();
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="bar-chart">
      {items.map((it, i) => (
        <div className="bar-row" key={`${it.label}-${i}`}>
          <span className="bar-label" title={it.label}>
            {it.label}
          </span>
          <div className="bar-track">
            <div
              className={`bar-fill ${tone}`}
              style={{
                width: mounted ? `${(it.value / max) * 100}%` : "0%",
                transitionDelay: `${i * 0.06}s`,
              }}
            />
          </div>
          <span className="bar-val">{formatCount(it.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Kpi({
  idx,
  icon,
  tone,
  label,
  value,
  hint,
}: {
  idx: number;
  icon: React.ReactNode;
  tone: "brand" | "success" | "warning" | "neutral";
  label: string;
  value: number;
  hint?: string;
}) {
  const iconClass = tone === "brand" ? "stat-icon" : `stat-icon ${tone}`;
  const shown = useCountUp(value);
  return (
    <div className="stat-card stat-in" style={{ animationDelay: `${idx * 0.07}s` }}>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{formatCount(shown)}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
      <div className={iconClass}>{icon}</div>
    </div>
  );
}
