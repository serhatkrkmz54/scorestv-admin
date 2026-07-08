"use client";

import { useEffect, useState } from "react";
import { apiListMedia, ApiError } from "@/lib/api-client";
import type { MediaItem } from "@/lib/types";

/**
 * Medya kütüphanesi seçici (modal). Açılınca daha önce yüklenmiş haber
 * görsellerini bir ızgarada gösterir; bir görsele tıklayınca onu KAPAK olarak
 * seçtirir (tekrar yükleme gerekmez). Escape / arka plan tıklaması kapatır.
 */
export default function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (key: string, url: string) => void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setError(null);
    apiListMedia(120)
      .then((list) => {
        if (alive) setItems(list);
      })
      .catch((e) => {
        if (alive) {
          setError(e instanceof ApiError ? e.message : "Medya yüklenemedi.");
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="media-backdrop" onClick={onClose}>
      <div className="media-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="media-head">
          <div className="section-title" style={{ margin: 0 }}>
            Medya Kütüphanesi
          </div>
          <button
            type="button"
            className="media-close"
            onClick={onClose}
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
        <div className="media-hint">
          Bir görsele tıkla → kapak olarak ayarlanır. Aynı görseli tekrar
          yüklemene gerek yok.
        </div>

        {loading && <div className="media-state">Yükleniyor…</div>}
        {error && <div className="media-state media-error">{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="media-state">Henüz yüklenmiş görsel yok.</div>
        )}
        {!loading && !error && items.length > 0 && (
          <div className="media-grid">
            {items.map((m) => (
              <button
                type="button"
                key={m.key}
                className="media-cell"
                title={m.key}
                onClick={() => {
                  onSelect(m.key, m.url);
                  onClose();
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
