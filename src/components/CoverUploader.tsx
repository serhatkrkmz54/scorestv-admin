"use client";

import { useState } from "react";
import { apiUploadImage, ApiError } from "@/lib/api-client";

/**
 * Kapak görseli yükleyici + CANLI piksel boyutlandırma.
 *
 * Akış: dosya seçilir → YÜKLENMEDEN önce genişlik/yükseklik (px) girilir
 * (en-boy kilidi + canlı önizleme) → "Uygula ve Yükle" görseli canvas ile tam
 * o boyuta getirip yükler. Yeniden boyutlandırma YEREL dosya üzerinde yapılır
 * (uzak URL değil) — bu yüzden canvas "tainted" olmaz, CORS sorunu yaşanmaz.
 *
 * Dönen `key` (URL değil) forma bildirilir; coverImageKey backend'e bu key ile
 * gider.
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

  // Seçilen ama henüz yüklenmemiş (boyutlandırma bekleyen) dosya.
  const [pending, setPending] = useState<{ file: File; url: string } | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [lock, setLock] = useState(true);

  function pick() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setError(null);
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        setPending({ file, url });
        setNatural({ w: img.naturalWidth, h: img.naturalHeight });
        setWidth(img.naturalWidth);
        setHeight(img.naturalHeight);
      } catch {
        URL.revokeObjectURL(url);
        setError("Görsel okunamadı.");
      }
    };
    input.click();
  }

  function cancelPending() {
    if (pending) URL.revokeObjectURL(pending.url);
    setPending(null);
    setNatural(null);
  }

  function onWidthChange(v: number) {
    const w = clamp(v);
    setWidth(w);
    if (lock && natural && natural.w > 0) {
      setHeight(Math.max(1, Math.round((w * natural.h) / natural.w)));
    }
  }
  function onHeightChange(v: number) {
    const h = clamp(v);
    setHeight(h);
    if (lock && natural && natural.h > 0) {
      setWidth(Math.max(1, Math.round((h * natural.w) / natural.h)));
    }
  }

  function preset(w: number, h: number) {
    setLock(false);
    setWidth(w);
    setHeight(h);
  }

  async function applyAndUpload() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await resizeToBlob(pending.file, clamp(width), clamp(height));
      const isPng = pending.file.type.includes("png");
      const resized = new File(
        [blob],
        `cover-${clamp(width)}x${clamp(height)}.${isPng ? "png" : "jpg"}`,
        { type: blob.type },
      );
      const res = await apiUploadImage(resized);
      onChange(res.key, res.url);
      cancelPending();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Görsel yüklenemedi.");
    } finally {
      setBusy(false);
    }
  }

  // --- Boyutlandırma paneli (dosya seçildi, henüz yüklenmedi) ---
  if (pending) {
    const previewW = Math.min(width || 1, 360);
    return (
      <div className="stack" style={{ gap: 10 }}>
        <div
          className="cover-resize-preview"
          style={{ width: previewW, aspectRatio: `${width || 1} / ${height || 1}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pending.url}
            alt="Kapak önizleme"
            style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }}
          />
        </div>

        <div className="row" style={{ gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ margin: 0 }}>
            <label className="label">Genişlik (px)</label>
            <input
              className="input"
              type="number"
              min={1}
              value={width}
              onChange={(e) => onWidthChange(Number(e.target.value) || 0)}
              style={{ width: 110 }}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label className="label">Yükseklik (px)</label>
            <input
              className="input"
              type="number"
              min={1}
              value={height}
              onChange={(e) => onHeightChange(Number(e.target.value) || 0)}
              style={{ width: 110 }}
            />
          </div>
          <label className="check-row" style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={lock}
              onChange={(e) => setLock(e.target.checked)}
            />
            En-boy kilidi
          </label>
        </div>

        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <span className="hint" style={{ marginRight: 4 }}>Hazır:</span>
          <button type="button" className="btn btn-sm" onClick={() => preset(1200, 630)}>
            1200×630
          </button>
          <button type="button" className="btn btn-sm" onClick={() => preset(1600, 900)}>
            1600×900
          </button>
          <button type="button" className="btn btn-sm" onClick={() => preset(1080, 1080)}>
            1080×1080
          </button>
          {natural && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setLock(true);
                setWidth(natural.w);
                setHeight(natural.h);
              }}
            >
              Orijinal ({natural.w}×{natural.h})
            </button>
          )}
        </div>

        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={applyAndUpload}
            disabled={busy || width < 1 || height < 1}
          >
            {busy ? "Yükleniyor..." : "Uygula ve Yükle"}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={cancelPending}
            disabled={busy}
          >
            İptal
          </button>
        </div>
        {error && <div className="field-error">{error}</div>}
      </div>
    );
  }

  // --- Normal görünüm (kapak var / yok) ---
  return (
    <div>
      {previewUrl ? (
        <div className="stack" style={{ gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="cover-preview" src={previewUrl} alt="Kapak önizleme" />
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-sm" onClick={pick} disabled={busy}>
              Değiştir / Boyutlandır
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
            Görsel Seç
          </button>
        </div>
      )}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

/** Görsel URL'ini yükler (naturalWidth/Height için). */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load error"));
    img.src = src;
  });
}

/** Yerel dosyayı canvas ile w×h boyutuna getirip Blob döner (CORS güvenli). */
async function resizeToBlob(file: File, w: number, h: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas context yok");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    const isPng = file.type.includes("png");
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob null"))),
        isPng ? "image/png" : "image/jpeg",
        0.9,
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 1..6000 arası tam sayıya sabitler. */
function clamp(v: number): number {
  if (!Number.isFinite(v)) return 1;
  return Math.min(6000, Math.max(1, Math.round(v)));
}
