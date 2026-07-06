"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileEdit,
  CheckCircle2,
  CalendarDays,
  Eye,
  Pencil,
  Send,
  Undo2,
  Copy,
  Trash2,
  Plus,
  Newspaper,
} from "lucide-react";
import {
  apiListNews,
  apiPublishNews,
  apiUnpublishNews,
  apiDeleteNews,
  ApiError,
} from "@/lib/api-client";
import type {
  NewsListItem,
  NewsPageResponse,
  NewsStatus,
} from "@/lib/types";
import {
  STATUS_LABELS,
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  SPORT_OPTIONS,
  LANG_LABELS,
  categoryLabel,
  sportLabel,
} from "@/lib/labels";
import { formatDate, formatCount } from "@/lib/format";
import StatusBadge from "./StatusBadge";
import {
  useTopbarSearchSubscription,
  setTopbarSearch,
  getTopbarSearch,
} from "@/lib/topbar-search";

const PAGE_SIZE = 20;

type Tab = "ALL" | NewsStatus;

const TABS: { key: Tab; label: string }[] = [
  { key: "ALL", label: "Tümü" },
  { key: "DRAFT", label: STATUS_LABELS.DRAFT },
  { key: "SCHEDULED", label: STATUS_LABELS.SCHEDULED },
  { key: "PUBLISHED", label: STATUS_LABELS.PUBLISHED },
  { key: "ARCHIVED", label: STATUS_LABELS.ARCHIVED },
];

export default function NewsListClient({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ALL");
  const [lang, setLang] = useState("");
  const [category, setCategory] = useState("");
  const [sport, setSport] = useState("");
  const [q, setQ] = useState(getTopbarSearch());
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(0);

  const [data, setData] = useState<NewsPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<number | null>(null);

  // Topbar araması ile senkron (UI-only köprü; API akışını değiştirmez).
  const onTopbarSearch = useCallback((v: string) => setQ(v), []);
  useTopbarSearchSubscription(onTopbarSearch);
  useEffect(() => {
    // Yerel input ile topbar'ı da güncel tut.
    if (getTopbarSearch() !== q) setTopbarSearch(q);
  }, [q]);

  // Arama debounce (300ms).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Filtre değişince sayfayı sıfırla.
  useEffect(() => {
    setPage(0);
  }, [tab, lang, category, sport, debouncedQ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiListNews({
        status: tab === "ALL" ? undefined : tab,
        lang: lang || undefined,
        category: category || undefined,
        sport: sport || undefined,
        q: debouncedQ || undefined,
        page,
        size: PAGE_SIZE,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Haberler alınamadı.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tab, lang, category, sport, debouncedQ, page]);

  useEffect(() => {
    void load();
  }, [load]);

  // Spor filtresi artık backend'de (sport param) uygulanıyor; sayfalama da
  // doğru çalışsın diye istemci tarafında ayrıca süzmüyoruz.
  const rows = useMemo(() => data?.items ?? [], [data]);

  async function doPublish(id: number) {
    setRowBusy(id);
    try {
      await apiPublishNews(id);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Yayınlanamadı.");
    } finally {
      setRowBusy(null);
    }
  }

  async function doUnpublish(id: number) {
    setRowBusy(id);
    try {
      await apiUnpublishNews(id);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Geri çekilemedi.");
    } finally {
      setRowBusy(null);
    }
  }

  async function doDelete(id: number, title: string) {
    if (!confirm(`"${title}" haberini silmek istediğinize emin misiniz?`)) return;
    setRowBusy(id);
    try {
      await apiDeleteNews(id);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Silinemedi.");
    } finally {
      setRowBusy(null);
    }
  }

  const total = data?.totalCount ?? 0;
  const hasNext = data?.hasNext ?? false;

  // ---- Stat kartları (mevcut veriden pragmatik türetim; ek backend çağrısı yok) ----
  // Bu ayki yayınlar: geçerli sayfadaki, bu ay yayınlanmış haberler.
  const items = data?.items ?? [];
  const now = new Date();
  const thisMonthCount = items.filter((it) => {
    if (!it.publishedAt) return false;
    const d = new Date(it.publishedAt);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  }).length;
  const withDateCount = items.filter((it) => it.publishedAt).length;
  const breakingCount = items.filter((it) => it.isBreaking).length;

  return (
    <div className="stack">
      {/* ---- Stat kartları ---- */}
      <div className="stat-grid">
        <StatCard
          icon={<FileEdit size={22} />}
          tone="neutral"
          label="Toplam Haber"
          value={formatCount(total)}
          hint="Bu filtreyle eşleşen"
        />
        <StatCard
          icon={<CheckCircle2 size={22} />}
          tone="success"
          label="Yayın Tarihli"
          value={formatCount(withDateCount)}
          hint="Bu sayfada"
        />
        <StatCard
          icon={<CalendarDays size={22} />}
          tone="warning"
          label="Bu Ay"
          value={formatCount(thisMonthCount)}
          hint="Bu sayfada yayınlanan"
        />
        <StatCard
          icon={<Eye size={22} />}
          tone="brand"
          label="Son Dakika"
          value={formatCount(breakingCount)}
          hint="Bu sayfada işaretli"
        />
      </div>

      <div className="spread">
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Haber Listesi</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Toplam {formatCount(total)} haber
          </div>
        </div>
        <Link href="/news/new" className="btn btn-primary">
          <Plus size={16} /> Yeni Haber
        </Link>
      </div>

      <div className="filters-bar">
        <input
          className="input search-input"
          placeholder="Başlıkta ara..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="select" value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="">Tüm diller</option>
          {Object.entries(LANG_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Tüm kategoriler</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select className="select" value={sport} onChange={(e) => setSport(e.target.value)}>
          <option value="">Tüm sporlar</option>
          {SPORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        {/* Durum sekmeleri (altı çizili aktif) — "Project Summary" stili */}
        <div style={{ padding: "6px 16px 0" }}>
          <div className="tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`tab ${tab === t.key ? "active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="card-pad">
            <div className="alert alert-error">{error}</div>
          </div>
        )}

        {loading ? (
          <div className="state-box">
            <div className="spinner" />
            <div className="mt-3">Yükleniyor...</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="state-box">
            <div className="state-icon">
              <Newspaper size={24} />
            </div>
            <div className="big">Haber bulunamadı</div>
            <div>Bu filtrelerle eşleşen haber yok. Yeni bir haber oluşturabilirsiniz.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kapak</th>
                  <th>Başlık</th>
                  <th>Dil</th>
                  <th>Kategori</th>
                  <th>Spor</th>
                  <th>Yayın Tarihi</th>
                  <th>Durum</th>
                  <th style={{ textAlign: "right" }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((it) => (
                  <Row
                    key={it.id}
                    item={it}
                    isAdmin={isAdmin}
                    tab={tab}
                    busy={rowBusy === it.id}
                    onPublish={() => doPublish(it.id)}
                    onUnpublish={() => doUnpublish(it.id)}
                    onDelete={() => doDelete(it.id, it.title)}
                    onEdit={() => router.push(`/news/${it.id}/edit`)}
                    onPreview={() => router.push(`/news/${it.id}/preview`)}
                    onDuplicate={() => router.push(`/news/new?copyFrom=${it.id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="pagination">
            <div>
              Sayfa {page + 1} — {formatCount(total)} kayıt
            </div>
            <div className="pages">
              <button
                className="btn btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Önceki
              </button>
              <button
                className="btn btn-sm"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
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

function Row({
  item,
  isAdmin,
  tab,
  busy,
  onPublish,
  onUnpublish,
  onDelete,
  onEdit,
  onPreview,
  onDuplicate,
}: {
  item: NewsListItem;
  isAdmin: boolean;
  tab: Tab;
  busy: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
}) {
  // NewsListItem status içermez. Durum pill'ini bağlamdan türetiriz:
  // - Aktif sekme belirli bir durumsa onu göster.
  // - "Tümü" sekmesinde: yayın tarihi varsa Yayında, yoksa Taslak varsay.
  const isPublishedContext = tab === "PUBLISHED";
  const displayStatus: NewsStatus =
    tab !== "ALL" ? tab : item.publishedAt ? "PUBLISHED" : "DRAFT";

  return (
    <tr>
      <td>
        {item.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="thumb" src={item.coverImageUrl} alt="" />
        ) : (
          <div className="thumb-empty">yok</div>
        )}
      </td>
      <td>
        <div className="cell-title">{item.title}</div>
        {item.summary && (
          <div className="cell-sub">
            {item.summary.length > 90 ? item.summary.slice(0, 90) + "…" : item.summary}
          </div>
        )}
        {(item.isBreaking || item.isFeatured) && (
          <div className="row" style={{ gap: 6, marginTop: 6 }}>
            {item.isBreaking && <span className="badge badge-flag">SON DK</span>}
            {item.isFeatured && (
              <span className="badge badge-scheduled">Öne Çıkan</span>
            )}
          </div>
        )}
      </td>
      <td>
        <span className="badge badge-lang">
          {LANG_LABELS[item.lang] ?? item.lang.toUpperCase()}
        </span>
      </td>
      <td>{categoryLabel(item.category)}</td>
      <td>{sportLabel(item.sport)}</td>
      <td>{formatDate(item.publishedAt)}</td>
      <td>
        <StatusBadge status={displayStatus} />
      </td>
      <td>
        <div className="row-actions">
          <button className="btn btn-sm" onClick={onEdit} disabled={busy}>
            <Pencil size={13} /> Düzenle
          </button>
          <button className="btn btn-sm btn-ghost" onClick={onPreview} disabled={busy}>
            <Eye size={13} /> Önizle
          </button>
          {isPublishedContext ? (
            <button className="btn btn-sm" onClick={onUnpublish} disabled={busy}>
              <Undo2 size={13} /> Geri Çek
            </button>
          ) : (
            <button className="btn btn-sm btn-success" onClick={onPublish} disabled={busy}>
              <Send size={13} /> Yayınla
            </button>
          )}
          <button className="btn btn-sm btn-ghost" onClick={onDuplicate} disabled={busy}>
            <Copy size={13} /> Kopyala
          </button>
          {isAdmin && (
            <button className="btn btn-sm btn-danger" onClick={onDelete} disabled={busy}>
              <Trash2 size={13} /> Sil
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
