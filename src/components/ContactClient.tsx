"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Mail,
  MailOpen,
  Archive,
  Trash2,
  RefreshCw,
  Reply,
  Paperclip,
  Smartphone,
  Globe,
} from "lucide-react";
import {
  apiListContact,
  apiUpdateContactStatus,
  apiDeleteContact,
  ApiError,
} from "@/lib/api-client";
import type {
  ContactMessageView,
  ContactPage,
  ContactStatus,
} from "@/lib/types";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 20;

type Tab = "ALL" | ContactStatus;
const TABS: { key: Tab; label: string }[] = [
  { key: "ALL", label: "Tümü" },
  { key: "NEW", label: "Yeni" },
  { key: "READ", label: "Okundu" },
  { key: "ARCHIVED", label: "Arşiv" },
];

const STATUS_BADGE: Record<ContactStatus, { label: string; cls: string }> = {
  NEW: { label: "Yeni", cls: "badge-flag" },
  READ: { label: "Okundu", cls: "badge-published" },
  ARCHIVED: { label: "Arşiv", cls: "badge-lang" },
};

function isImage(ct: string | null): boolean {
  return !!ct && ct.startsWith("image/");
}

export default function ContactClient() {
  const [tab, setTab] = useState<Tab>("ALL");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<ContactPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    setPage(0);
  }, [tab]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiListContact({
        status: tab === "ALL" ? undefined : tab,
        page,
        size: PAGE_SIZE,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Mesajlar alınamadı.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: number, status: ContactStatus) {
    setBusy(id);
    try {
      await apiUpdateContactStatus(id, status);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Güncellenemedi.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: number) {
    if (!confirm("Bu mesajı silmek istediğinize emin misiniz?")) return;
    setBusy(id);
    try {
      await apiDeleteContact(id);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Silinemedi.");
    } finally {
      setBusy(null);
    }
  }

  const rows = data?.content ?? [];
  const total = data?.totalElements ?? 0;
  const isLast = data?.last ?? true;

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>İletişim Mesajları</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Toplam {total.toLocaleString("tr-TR")} mesaj
          </div>
        </div>
        <button className="btn" onClick={() => load()} disabled={loading}>
          <RefreshCw size={16} /> Yenile
        </button>
      </div>

      <div className="card">
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
              <Mail size={24} />
            </div>
            <div className="big">Mesaj yok</div>
            <div>Bu filtreyle eşleşen iletişim mesajı yok.</div>
          </div>
        ) : (
          <div className="card-pad msg-list">
            {rows.map((m) => (
              <MessageCard
                key={m.id}
                m={m}
                busy={busy === m.id}
                onMarkRead={() => setStatus(m.id, "READ")}
                onArchive={() => setStatus(m.id, "ARCHIVED")}
                onDelete={() => remove(m.id)}
              />
            ))}
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
                disabled={isLast}
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

function MessageCard({
  m,
  busy,
  onMarkRead,
  onArchive,
  onDelete,
}: {
  m: ContactMessageView;
  busy: boolean;
  onMarkRead: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const st = STATUS_BADGE[m.status] ?? { label: m.status, cls: "badge-lang" };
  const isNew = m.status === "NEW";
  const initials = (m.name || m.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const mailto = `mailto:${m.email}?subject=${encodeURIComponent(
    "RE: " + (m.subject || "Scores TV iletişim"),
  )}`;

  return (
    <div className={`msg-card ${isNew ? "msg-new" : ""}`}>
      <div className="msg-head">
        <span className="user-ava">{initials}</span>
        <div className="msg-who">
          <div className="msg-name">
            {m.name || "—"}
            <span className={`badge ${st.cls}`} style={{ marginLeft: 8 }}>
              {st.label}
            </span>
            {m.source && (
              <span className="msg-source" title={m.source}>
                {m.source === "mobile" ? <Smartphone size={12} /> : <Globe size={12} />}
                {m.source}
              </span>
            )}
          </div>
          <a href={`mailto:${m.email}`} className="msg-email">
            {m.email}
          </a>
        </div>
        <div className="msg-date">{formatDate(m.createdAt)}</div>
      </div>

      {m.subject && <div className="msg-subject">{m.subject}</div>}
      <div className="msg-body">{m.message}</div>

      {m.attachments.length > 0 && (
        <div className="msg-atts">
          <div className="msg-atts-label">
            <Paperclip size={13} /> {m.attachments.length} ek
          </div>
          <div className="msg-atts-grid">
            {m.attachments.map((a, i) =>
              isImage(a.contentType) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <a key={i} href={a.url} target="_blank" rel="noopener noreferrer">
                  <img className="msg-att-img" src={a.url} alt={a.originalName ?? ""} />
                </a>
              ) : (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="msg-att-file"
                >
                  <Paperclip size={13} /> {a.originalName || "dosya"}
                </a>
              ),
            )}
          </div>
        </div>
      )}

      <div className="msg-actions">
        <a href={mailto} className="btn btn-sm btn-primary">
          <Reply size={14} /> Yanıtla
        </a>
        {isNew && (
          <button className="btn btn-sm" onClick={onMarkRead} disabled={busy}>
            <MailOpen size={14} /> Okundu
          </button>
        )}
        {m.status !== "ARCHIVED" && (
          <button className="btn btn-sm" onClick={onArchive} disabled={busy}>
            <Archive size={14} /> Arşivle
          </button>
        )}
        <button className="btn btn-sm btn-danger" onClick={onDelete} disabled={busy}>
          <Trash2 size={14} /> Sil
        </button>
      </div>
    </div>
  );
}
