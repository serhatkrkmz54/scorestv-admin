"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  apiListMedia,
  apiMediaUsage,
  apiDeleteMedia,
  ApiError,
} from "@/lib/api-client";
import type { MediaItem, MediaUsage } from "@/lib/types";

const STATUS_TR: Record<string, string> = {
  DRAFT: "Taslak",
  PUBLISHED: "Yayında",
  SCHEDULED: "Zamanlanmış",
  ARCHIVED: "Arşiv",
};

export default function MediaLibraryClient() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [usage, setUsage] = useState<MediaUsage[] | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await apiListMedia(300));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Medya yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openDetail(item: MediaItem) {
    setSelected(item);
    setUsage(null);
    setUsageLoading(true);
    try {
      setUsage(await apiMediaUsage(item.key));
    } catch {
      setUsage([]);
    } finally {
      setUsageLoading(false);
    }
  }

  function closeDetail() {
    setSelected(null);
    setUsage(null);
  }

  async function del() {
    if (!selected) return;
    const count = usage?.length ?? 0;
    const msg =
      count > 0
        ? `Bu görsel ${count} haberde kullanılıyor. Silersen o haberlerdeki görsel kırılır. Yine de silinsin mi?`
        : "Bu görseli silmek istediğine emin misin?";
    if (!window.confirm(msg)) return;
    setDeleting(true);
    try {
      await apiDeleteMedia(selected.key);
      closeDetail();
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Görsel silinemedi.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Medya</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Yüklenmiş görseller. Bir görsele tıkla → hangi haberde kullanıldığını
            gör ve gerekiyorsa sil.
          </div>
        </div>
        <button className="btn" onClick={load} disabled={loading}>
          Yenile
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card card-pad">
        {loading ? (
          <div className="media-state">Yükleniyor…</div>
        ) : items.length === 0 ? (
          <div className="media-state">Henüz yüklenmiş görsel yok.</div>
        ) : (
          <div className="media-grid">
            {items.map((m) => (
              <button
                type="button"
                key={m.key}
                className="media-cell"
                title={m.key}
                onClick={() => openDetail(m)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="media-backdrop" onClick={closeDetail}>
          <div className="media-modal card" onClick={(e) => e.stopPropagation()}>
            <div className="media-head">
              <div className="section-title" style={{ margin: 0 }}>
                Görsel Detayı
              </div>
              <button
                type="button"
                className="media-close"
                onClick={closeDetail}
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>

            <div className="medlib-detail">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="medlib-preview" src={selected.url} alt="" />

              <div className="medlib-info">
                <div className="medlib-usage-title">Kullanım</div>
                {usageLoading ? (
                  <div className="muted" style={{ fontSize: 13 }}>
                    Kontrol ediliyor…
                  </div>
                ) : (usage?.length ?? 0) === 0 ? (
                  <div className="muted" style={{ fontSize: 13 }}>
                    Herhangi bir habere bağlı değil. Güvenle silebilirsin.
                  </div>
                ) : (
                  <div className="medlib-usage">
                    {usage!.map((u) => (
                      <Link
                        key={u.articleId}
                        href={`/news/${u.articleId}/edit`}
                        className="medlib-usage-row"
                      >
                        <span className="medlib-usage-name">
                          {u.title || "(başlıksız)"}
                        </span>
                        <span className="medlib-usage-badges">
                          {u.lang && (
                            <span className="bc-badge">
                              {u.lang.toUpperCase()}
                            </span>
                          )}
                          {u.cover && <span className="bc-badge">Kapak</span>}
                          {u.inBody && <span className="bc-badge">Metin</span>}
                          <span className="bc-badge">
                            {STATUS_TR[u.status] ?? u.status}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                <button
                  className="btn btn-danger medlib-del"
                  onClick={del}
                  disabled={deleting || usageLoading}
                >
                  {deleting ? "Siliniyor…" : "Görseli Sil"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
