"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FileEdit,
  Eye,
  CalendarDays,
  TrendingUp,
  Users,
  Activity,
  Flame,
  RefreshCw,
  Plus,
  Pencil,
  ExternalLink,
  FilePlus2,
  Send,
  Undo2,
  Trash2,
  Archive,
} from "lucide-react";
import { apiNewsStats, ApiError } from "@/lib/api-client";
import type {
  NewsStats,
  NewsStatsActivity,
  NewsStatsTrendPoint,
} from "@/lib/types";
import { STATUS_LABELS } from "@/lib/labels";
import { formatCount, formatDate } from "@/lib/format";
import AppStatsSection from "./AppStatsSection";

const WEB_BASE = process.env.NEXT_PUBLIC_WEB_URL || "https://scorestv.com";

const ACTION_META: Record<
  string,
  { label: string; icon: React.ReactNode; tone: string }
> = {
  CREATE: { label: "oluşturdu", icon: <FilePlus2 size={14} />, tone: "neutral" },
  UPDATE: { label: "güncelledi", icon: <Pencil size={14} />, tone: "brand" },
  PUBLISH: { label: "yayınladı", icon: <Send size={14} />, tone: "success" },
  UNPUBLISH: { label: "geri çekti", icon: <Undo2 size={14} />, tone: "warning" },
  ARCHIVE: { label: "arşivledi", icon: <Archive size={14} />, tone: "brand" },
  DELETE: { label: "sildi", icon: <Trash2 size={14} />, tone: "danger" },
};

function relTime(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.round(diff / 60000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} sa önce`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} gün önce`;
  return formatDate(iso);
}

function liveUrl(a: { lang: string; slug: string }): string {
  return `${WEB_BASE}/${a.lang === "en" ? "news" : "haber"}/${a.slug}`;
}

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

export default function Dashboard() {
  const [data, setData] = useState<NewsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setData(await apiNewsStats());
      setTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "İstatistikler alınamadı.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="state-box">
        <div className="spinner" />
        <div className="mt-3">Panel yükleniyor...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card card-pad">
        <div className="alert alert-error">{error ?? "Veri yok."}</div>
        <button className="btn" style={{ marginTop: 12 }} onClick={() => load()}>
          <RefreshCw size={16} /> Tekrar dene
        </button>
      </div>
    );
  }

  // Savunma: backend bir listeyi hiç döndürmezse (beklenmez) UI çökmesin.
  const topViewed = data.topViewed ?? [];
  const editors = data.editors ?? [];
  const recentActivity = data.recentActivity ?? [];
  const trend = data.trend ?? [];

  const segments = [
    { label: STATUS_LABELS.PUBLISHED, value: data.published, color: "var(--success)" },
    { label: STATUS_LABELS.DRAFT, value: data.draft, color: "var(--neutral)" },
    { label: STATUS_LABELS.SCHEDULED, value: data.scheduled, color: "var(--warning)" },
    { label: STATUS_LABELS.ARCHIVED, value: data.archived, color: "var(--archive)" },
  ];

  return (
    <div className="stack">
      {/* Uygulama (üye/cihaz/oyun) istatistikleri — kendi bölümü, en üstte. */}
      <AppStatsSection />

      <div className="spread">
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Panel Özeti</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Haber üretimi ve etkileşim istatistikleri
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" onClick={() => load(true)} disabled={refreshing} title="Yenile">
            <RefreshCw size={16} className={refreshing ? "spin" : ""} />
            Yenile
          </button>
          <Link href="/news/new" className="btn btn-primary">
            <Plus size={16} /> Yeni Haber
          </Link>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard idx={0} icon={<FileEdit size={22} />} tone="neutral" label="Toplam Haber"
          value={data.total} hint={`${formatCount(data.published)} yayında`} />
        <StatCard idx={1} icon={<Eye size={22} />} tone="brand" label="Toplam Görüntülenme"
          value={data.totalViews} hint="Tüm zamanlar" />
        <StatCard idx={2} icon={<CalendarDays size={22} />} tone="warning" label="Bu Ay Yayınlanan"
          value={data.publishedThisMonth}
          hint={`Bu hafta ${formatCount(data.publishedThisWeek)} • bugün ${formatCount(data.publishedToday)}`} />
        <StatCard idx={3} icon={<Flame size={22} />} tone="success" label="Son Dakika"
          value={data.breaking} hint={`${formatCount(data.featured)} öne çıkan`} />
      </div>

      <div className="dash-2col">
        <div className="card card-pad">
          <div className="dash-head">
            <TrendingUp size={16} />
            <span>Son 14 Gün — Yayın Trendi</span>
          </div>
          <TrendChart key={`t${tick}`} data={trend} />
        </div>

        <div className="card card-pad">
          <div className="dash-head">
            <FileEdit size={16} />
            <span>Durum Dağılımı</span>
          </div>
          <StatusDonut key={`d${tick}`} segments={segments} total={data.total} />
        </div>
      </div>

      <div className="dash-2col">
        <div className="card card-pad">
          <div className="dash-head">
            <Eye size={16} />
            <span>En Çok Okunanlar</span>
          </div>
          {topViewed.length === 0 ? (
            <div className="muted" style={{ padding: "8px 0" }}>Henüz veri yok.</div>
          ) : (
            <ol className="top-list">
              {topViewed.map((a, i) => (
                <li key={a.id} className="top-item">
                  <span className="top-rank">{i + 1}</span>
                  <div className="top-main">
                    <div className="top-title">{a.title}</div>
                    <div className="top-sub">
                      <span className="badge badge-lang">{a.lang.toUpperCase()}</span>
                      <span className="muted">{formatCount(a.viewCount)} görüntülenme</span>
                    </div>
                  </div>
                  <div className="top-actions">
                    <Link href={`/news/${a.id}/edit`} className="btn btn-icon btn-ghost" title="Düzenle" aria-label="Düzenle">
                      <Pencil size={15} />
                    </Link>
                    {a.status === "PUBLISHED" && (
                      <a href={liveUrl(a)} target="_blank" rel="noopener noreferrer"
                        className="btn btn-icon btn-ghost" title="Habere git" aria-label="Habere git">
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="card card-pad">
          <div className="dash-head">
            <Users size={16} />
            <span>Editör Üretimi</span>
          </div>
          {editors.length === 0 ? (
            <div className="muted" style={{ padding: "8px 0" }}>Henüz veri yok.</div>
          ) : (
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Editör</th>
                  <th style={{ textAlign: "right" }}>Yayında</th>
                  <th style={{ textAlign: "right" }}>Toplam</th>
                </tr>
              </thead>
              <tbody>
                {editors.map((e) => (
                  <tr key={e.authorId}>
                    <td>{e.name}</td>
                    <td style={{ textAlign: "right" }}>{formatCount(e.published)}</td>
                    <td style={{ textAlign: "right" }}>{formatCount(e.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card card-pad">
        <div className="dash-head">
          <Activity size={16} />
          <span>Son Aktivite</span>
        </div>
        {recentActivity.length === 0 ? (
          <div className="muted" style={{ padding: "8px 0" }}>Henüz aktivite yok.</div>
        ) : (
          <ul className="activity-list">
            {recentActivity.map((a) => (
              <ActivityRow key={`${a.at}-${a.action}-${a.articleId ?? ""}`} a={a} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: NewsStatsTrendPoint[] }) {
  const mounted = useMounted();
  const [hover, setHover] = useState<number | null>(null);

  const W = 680;
  const H = 176;
  const pad = { t: 16, r: 14, b: 26, l: 14 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const n = data.length;
  const max = Math.max(1, ...data.map((d) => d.count));
  const baseY = pad.t + ih;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const pts = data.map((d, i) => ({ px: x(i), py: y(d.count), ...d }));

  let line = pts.length ? `M ${pts[0].px} ${pts[0].py}` : "";
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const cx = (p0.px + p1.px) / 2;
    line += ` C ${cx} ${p0.py} ${cx} ${p1.py} ${p1.px} ${p1.py}`;
  }
  const area = pts.length
    ? `${line} L ${pts[n - 1].px} ${baseY} L ${pts[0].px} ${baseY} Z`
    : "";

  const hp = hover != null ? pts[hover] : null;
  const tipW = 82;
  const tipX = hp ? Math.min(Math.max(hp.px - tipW / 2, 4), W - tipW - 4) : 0;
  const tipY = hp ? (hp.py - 46 < 4 ? hp.py + 12 : hp.py - 46) : 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tchart"
      onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="tgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.30" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 0.5, 1].map((f) => (
        <line key={f} className="tgrid" x1={pad.l} x2={W - pad.r}
          y1={pad.t + ih * f} y2={pad.t + ih * f} />
      ))}

      <path d={area} fill="url(#tgrad)" className={`tarea ${mounted ? "in" : ""}`} />
      <path d={line} className={`tline ${mounted ? "in" : ""}`} pathLength={1} />

      {pts.map((p, i) => (
        <circle key={i} cx={p.px} cy={p.py} r={hover === i ? 5 : 3}
          className={`tdot ${mounted ? "in" : ""} ${hover === i ? "hot" : ""}`}
          style={{ transitionDelay: `${0.5 + i * 0.03}s` }} />
      ))}

      {pts.map((p, i) =>
        i % 2 === 0 || i === n - 1 ? (
          <text key={`l${i}`} x={p.px} y={H - 8} className="tlabel" textAnchor="middle">
            {new Date(p.date).getDate()}
          </text>
        ) : null,
      )}

      {pts.map((p, i) => (
        <rect key={`h${i}`} x={p.px - iw / (2 * Math.max(1, n - 1))} y={0}
          width={iw / Math.max(1, n - 1)} height={H} fill="transparent"
          onMouseEnter={() => setHover(i)} />
      ))}

      {hp && (
        <g className="ttip">
          <line className="tguide" x1={hp.px} x2={hp.px} y1={pad.t} y2={baseY} />
          <rect x={tipX} y={tipY} width={tipW} height={34} rx={7} className="ttip-box" />
          <text x={tipX + tipW / 2} y={tipY + 15} textAnchor="middle" className="ttip-val">
            {hp.count} haber
          </text>
          <text x={tipX + tipW / 2} y={tipY + 27} textAnchor="middle" className="ttip-date">
            {new Date(hp.date).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
          </text>
        </g>
      )}
    </svg>
  );
}

function StatusDonut({
  segments,
  total,
}: {
  segments: { label: string; value: number; color: string }[];
  total: number;
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
              <circle key={i} cx={cx} cy={cy} r={R} fill="none" strokeWidth={sw}
                strokeLinecap="round" className="donut-seg"
                stroke={a.color}
                strokeDasharray={mounted ? `${Math.max(a.len - 2, 0)} ${C}` : `0 ${C}`}
                strokeDashoffset={a.offset}
                style={{ transitionDelay: `${i * 0.08}s` }} />
            ))}
          </g>
        </svg>
        <div className="donut-center">
          <div className="donut-total">{formatCount(count)}</div>
          <div className="donut-cap">haber</div>
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

function ActivityRow({ a }: { a: NewsStatsActivity }) {
  const meta = ACTION_META[a.action] ?? {
    label: a.action.toLowerCase(),
    icon: <Activity size={14} />,
    tone: "neutral",
  };
  return (
    <li className="activity-item">
      <span className={`activity-icon ${meta.tone}`}>{meta.icon}</span>
      <div className="activity-main">
        <div className="activity-text">
          <strong>{a.actorName ?? "Bilinmeyen"}</strong> {meta.label}
          {a.articleTitle ? (
            a.articleId ? (
              <>
                {" "}
                <Link href={`/news/${a.articleId}/edit`} className="activity-link">
                  {a.articleTitle}
                </Link>
              </>
            ) : (
              <> “{a.articleTitle}”</>
            )
          ) : null}
        </div>
        <div className="activity-time">{relTime(a.at)}</div>
      </div>
    </li>
  );
}

function StatCard({
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
