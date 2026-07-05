"use client";

import { useState } from "react";
import { apiUploadImage, ApiError } from "@/lib/api-client";

/**
 * Kapak görseli yükleyici. Dosyayı /api/news/images'e yükler; dönen `key`'i
 * (URL değil) forma bildirir ve `url`'i önizler. coverImageKey backend'e bu
 * key ile gider.
 */
export default function CoverUploader({
  coverKey,
  previewUrl,
  onChange,
}: {
  coverKey: string | null;
  previewUrl: string | null;
  onChange: (key: string | null, url: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusy(true);
      setError(null);
      try {
        const res = await apiUploadImage(file);
        onChange(res.key, res.url);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Görsel yüklenemedi.");
      } finally {
        setBusy(false);
      }
    };
    input.click();
  }

  return (
    <div>
      {previewUrl ? (
        <div className="stack" style={{ gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="cover-preview" src={previewUrl} alt="Kapak önizleme" />
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-sm" onClick={pick} disabled={busy}>
              {busy ? "Yükleniyor..." : "Değiştir"}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => onChange(null, null)}
              disabled={busy}
            >
              Kaldır
            </button>
          </div>
          {coverKey && <div className="hint">Anahtar: {coverKey}</div>}
        </div>
      ) : (
        <div className="cover-box">
          <div className="muted mb-3">Henüz kapak görseli yok.</div>
          <button type="button" className="btn btn-sm btn-primary" onClick={pick} disabled={busy}>
            {busy ? "Yükleniyor..." : "Görsel Yükle"}
          </button>
        </div>
      )}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}
