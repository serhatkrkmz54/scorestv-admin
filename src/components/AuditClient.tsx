"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  FilePlus2,
  Pencil,
  Send,
  Undo2,
  Archive,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { apiNewsAudit, ApiError } from "@/lib/api-client";
import type { NewsAuditPage, NewsAuditView } from "@/lib/types";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 30;

const ACTIONS: { value: string; label: string }[] = [
  { value: "", label: "Tüm eylemler" },
  { value: "CREATE", label: "Oluşturma" },
  { value: "UPDATE", label: "Güncelleme" },
  { value: "PUBLISH", label: "Yayınlama" },
  { value: "UNPUBLISH", label: "Geri çekme" },
  { value: "ARCHIVE", label: "Arşivleme" },
  { value: "DELETE", label: "Silme" },
];

const META: Record<string, { label: string; icon: React.ReactNode; tone: string }> = {
  CREATE: { label: "oluşturdu", icon: <FilePlus2 size={14} />, tone: "neutral" },
  UPDATE: { label: "güncelledi", icon: <Pencil size={14} />, tone: "brand" },
  PUBLISH: { label: "yayınladı", icon: <Send size={14} />, tone: "success" },
  UNPUBLISH: { label: "geri çekti", icon: <Undo2 size={14} />, tone: "warning" },
  ARCHIVE: { label: "arşivledi", icon: <Archive size={14} />, tone: "brand" },
  DELETE: { label: "sildi", icon: <Trash2 size={14} />, tone: "danger" },
};

export default function AuditClient() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<NewsAuditPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(0);
  }, [action]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiNewsAudit(action, page, PAGE_SIZE));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Günlük alınamadı.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [action, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = data?.items ?? [];
  const total = data?.totalCount ?? 0;
  const hasNext = data?.hasNext ?? false;

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Denetim Günlüğü</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Toplam {total.toLocaleString("tr-TR")} kayıt
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <select className="select" value={action} onChange={(e) => setAction(e.target.value)}>
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <button className="btn" onClick={() => load()} disabled={loading}>
            <RefreshCw size={16} /> Yenile
          </button>
        </div>
      </div>

      <div className="card card-pad">
        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="state-box">
            <div className="spinner" />
            <div className="mt-3">Yükleniyor...</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="state-box">
            <div className="state-icon">
              <Activity size={24} />
            </div>
            <div className="big">Kayıt yok</div>
          </div>
        ) : (
          <ul className="activity-list">
            {rows.map((a) => (
              <AuditRow key={a.id} a={a} />
            ))}
          </ul>
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

function AuditRow({ a }: { a: NewsAuditView }) {
  const m = META[a.action] ?? {
    label: a.action.toLowerCase(),
    icon: <Activity size={14} />,
    tone: "neutral",
  };
  return (
    <li className="activity-item">
      <span className={`activity-icon ${m.tone}`}>{m.icon}</span>
      <div className="activity-main">
        <div className="activity-text">
          <strong>{a.actorName ?? "Bilinmeyen"}</strong> {m.label}
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
          ) : a.meta ? (
            <> ({a.meta})</>
          ) : null}
        </div>
        <div className="activity-time">{formatDate(a.at)}</div>
      </div>
    </li>
  );
}
