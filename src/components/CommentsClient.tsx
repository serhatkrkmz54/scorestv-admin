"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Trash2, Undo2, RefreshCw, Search } from "lucide-react";
import {
  apiListComments,
  apiDeleteComment,
  apiRestoreComment,
  ApiError,
} from "@/lib/api-client";
import type { AdminCommentView, AdminCommentPage } from "@/lib/types";
import { SPORT_OPTIONS, sportLabel } from "@/lib/labels";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 30;

type DeletedFilter = "all" | "active" | "deleted";

export default function CommentsClient() {
  const [sport, setSport] = useState("");
  const [deletedFilter, setDeletedFilter] = useState<DeletedFilter>("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(0);

  const [data, setData] = useState<AdminCommentPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(0);
  }, [sport, deletedFilter, debouncedQ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiListComments({
        sport: sport || undefined,
        deleted:
          deletedFilter === "all" ? undefined : deletedFilter === "deleted",
        q: debouncedQ || undefined,
        page,
        size: PAGE_SIZE,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Yorumlar alınamadı.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [sport, deletedFilter, debouncedQ, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function doDelete(id: number) {
    if (!confirm("Bu yorumu gizlemek istediğinize emin misiniz?")) return;
    setRowBusy(id);
    try {
      await apiDeleteComment(id);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Silinemedi.");
    } finally {
      setRowBusy(null);
    }
  }

  async function doRestore(id: number) {
    setRowBusy(id);
    try {
      await apiRestoreComment(id);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Geri getirilemedi.");
    } finally {
      setRowBusy(null);
    }
  }

  const rows = data?.items ?? [];
  const total = data?.totalCount ?? 0;
  const hasNext = data?.hasNext ?? false;

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Yorum Moderasyonu</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Toplam {total.toLocaleString("tr-TR")} yorum
          </div>
        </div>
        <button className="btn" onClick={() => load()} disabled={loading}>
          <RefreshCw size={16} /> Yenile
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            className="input search-input"
            placeholder="Yorum metninde ara..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className="select" value={sport} onChange={(e) => setSport(e.target.value)}>
          <option value="">Tüm sporlar</option>
          {SPORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value.toUpperCase()}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={deletedFilter}
          onChange={(e) => setDeletedFilter(e.target.value as DeletedFilter)}
        >
          <option value="all">Tümü</option>
          <option value="active">Yalnız aktif</option>
          <option value="deleted">Yalnız gizli</option>
        </select>
      </div>

      <div className="card">
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
              <MessageSquare size={24} />
            </div>
            <div className="big">Yorum bulunamadı</div>
            <div>Bu filtrelerle eşleşen yorum yok.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kullanıcı</th>
                  <th>Yorum</th>
                  <th>Spor</th>
                  <th>Maç</th>
                  <th>Tarih</th>
                  <th>Durum</th>
                  <th style={{ textAlign: "right" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <CommentRow
                    key={c.id}
                    item={c}
                    busy={rowBusy === c.id}
                    onDelete={() => doDelete(c.id)}
                    onRestore={() => doRestore(c.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="pagination">
            <div>Sayfa {page + 1}</div>
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

function CommentRow({
  item,
  busy,
  onDelete,
  onRestore,
}: {
  item: AdminCommentView;
  busy: boolean;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const initials = (item.userName || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <tr className={item.deleted ? "row-muted" : ""}>
      <td>
        <div className="user-cell">
          <span className="user-ava">{initials}</span>
          <div>
            <div className="user-name">{item.userName ?? "—"}</div>
            {item.country && <div className="user-sub">{item.country}</div>}
          </div>
        </div>
      </td>
      <td>
        <div className="comment-body">{item.content}</div>
        {item.parentId && <span className="badge badge-lang">yanıt</span>}
      </td>
      <td>{sportLabel(item.sport?.toLowerCase())}</td>
      <td className="muted">#{item.matchId}</td>
      <td>{formatDate(item.createdAt)}</td>
      <td>
        {item.deleted ? (
          <span className="badge badge-flag">Gizli</span>
        ) : (
          <span className="badge badge-published">Yayında</span>
        )}
      </td>
      <td>
        <div className="row-actions">
          {item.deleted ? (
            <button
              className="btn btn-icon btn-success"
              onClick={onRestore}
              disabled={busy}
              title="Geri getir"
              aria-label="Geri getir"
            >
              <Undo2 size={15} />
            </button>
          ) : (
            <button
              className="btn btn-icon btn-danger"
              onClick={onDelete}
              disabled={busy}
              title="Gizle (sil)"
              aria-label="Gizle"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
