"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileEdit,
  CheckCircle2,
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
import type { NewsStats, NewsStatsActivity } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/labels";
import { formatCount, formatDate } from "@/lib/format";

const WEB_BASE = process.env.NEXT_PUBLIC_WEB_URL || "https://scorestv.com";

// audit action → Türkçe etiket + ikon
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

export default function Dashboard() {
  const [data, setData] = useState<NewsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setData(await apiNewsStats());
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

  const trendMax = useMemo(
    () => Math.max(1, ...(data?.trend ?? []).map((p) => p.count)),
    [data],
  );

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

  const statusRows: { key: keyof NewsStats; label: string; cls: string }[] = [
    { key: "published", label: STATUS_LABELS.PUBLISHED, cls: "success" },
    { key: "draft", label: STATUS_LABELS.DRAFT, cls: "neutral" },
    { key: "scheduled", label: STATUS_LABELS.SCHEDULED, cls: "warning" },
    { key: "archived", label: STATUS_LABELS.ARCHIVED, cls: "brand" },
  ];
  const statusMax = Math.max(
    1,
    data.published,
    data.draft,
    data.scheduled,
    data.archived,
  );

  return (
    <div className="stack">
      {/* Başlık */}
      <div className="spread">
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Panel Özeti</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Haber üretimi ve etkileşim istatistikleri
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button
            className="btn"
            onClick={() => load(true)}
            disabled={refreshing}
            title="Yenile"
          >
            <RefreshCw size={16} className={refreshing ? "spin" : ""} />
            Yenile
          </button>
          <Link href="/news/new" className="btn btn-primary">
            <Plus size={16} /> Yeni Haber
          </Link>
        </div>
      </div>

      {/* Stat kartları */}
      <div className="stat-grid">
        <StatCard
          icon={<FileEdit size={22} />}
          tone="neutral"
          label="Toplam Haber"
          value={formatCount(data.total)}
          hint={`${formatCount(data.published)} yayında`}
        />
        <StatCard
          icon={<Eye size={22} />}
          tone="brand"
          label="Toplam Görüntülenme"
          value={formatCount(data.totalViews)}
          hint="Tüm zamanlar"
        />
        <StatCard
          icon={<CalendarDays size={22} />}
          tone="warning"
          label="Bu Ay Yayınlanan"
          value={formatCount(data.publishedThisMonth)}
          hint={`Bu hafta ${formatCount(data.publishedThisWeek)} • bugün ${formatCount(
            data.publishedToday,
          )}`}
        />
        <StatCard
          icon={<Flame size={22} />}
          tone="success"
          label="Son Dakika"
          value={formatCount(data.breaking)}
          hint={`${formatCount(data.featured)} öne çıkan`}
        />
      </div>

      {/* Trend + Durum dağılımı */}
      <div className="dash-2col">
        <div className="card card-pad">
          <div className="dash-head">
            <TrendingUp size={16} />
            <span>Son 14 Gün — Yayın Trendi</span>
          </div>
          <div className="trend-chart">
            {data.trend.map((p) => {
              const h = Math.round((p.count / trendMax) * 100);
              const d = new Date(p.date);
              return (
                <div className="trend-col" key={p.date} title={`${p.date}: ${p.count} haber`}>
                  <div className="trend-bar-wrap">
                    <span className="trend-val">{p.count > 0 ? p.count : ""}</span>
                    <div
                      className="trend-bar"
                      style={{ height: `${Math.max(h, p.count > 0 ? 6 : 2)}%` }}
                    />
                  </div>
                  <div className="trend-label">{d.getDate()}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card card-pad">
          <div className="dash-head">
            <FileEdit size={16} />
            <span>Durum Dağılımı</span>
          </div>
          <div className="status-bars">
            {statusRows.map((s) => {
              const val = data[s.key] as number;
              const w = Math.round((val / statusMax) * 100);
              return (
                <div className="status-row" key={s.key}>
                  <div className="status-name">{s.label}</div>
                  <div className="status-track">
                    <div className={`status-fill ${s.cls}`} style={{ width: `${w}%` }} />
                  </div>
                  <div className="status-count">{formatCount(val)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* En çok okunanlar + Editörler */}
      <div className="dash-2col">
        <div className="card card-pad">
          <div className="dash-head">
            <Eye size={16} />
            <span>En Çok Okunanlar</span>
          </div>
          {data.topViewed.length === 0 ? (
            <div className="muted" style={{ padding: "8px 0" }}>Henüz veri yok.</div>
          ) : (
            <ol className="top-list">
              {data.topViewed.map((a, i) => (
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
                      <a
                        href={liveUrl(a)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-icon btn-ghost"
                        title="Habere git"
                        aria-label="Habere git"
                      >
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
          {data.editors.length === 0 ? (
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
                {data.editors.map((e) => (
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

      {/* Son aktivite */}
      <div className="card card-pad">
        <div className="dash-head">
          <Activity size={16} />
          <span>Son Aktivite</span>
        </div>
        {data.recentActivity.length === 0 ? (
          <div className="muted" style={{ padding: "8px 0" }}>Henüz aktivite yok.</div>
        ) : (
          <ul className="activity-list">
            {data.recentActivity.map((a, i) => (
              <ActivityRow key={i} a={a} />
            ))}
          </ul>
        )}
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
  icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  tone: "brand" | "success" | "warning" | "neutral";
  label: string;
  value: string;
  hint?: string;
}) {
  const iconClass = tone === "brand" ? "stat-icon" : `stat-icon ${tone}`;
  return (
    <div className="stat-card">
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
      <div className={iconClass}>{icon}</div>
    </div>
  );
}
