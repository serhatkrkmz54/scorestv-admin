"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { apiSearch } from "@/lib/api-client";
import type { GamePlayerRef, SearchPlayerHit } from "@/lib/types";

// Oyuncu arama + seçme. Backend /api/v1/search?types=player kullanır; seçince
// id/name/photo denormalize edilir (takım opsiyonel, düello formunda girilir).
export default function PlayerPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: GamePlayerRef | null;
  onChange: (p: GamePlayerRef | null) => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchPlayerHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    let alive = true;
    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await apiSearch(term, "player");
        if (alive) {
          setHits(res.players ?? []);
          setOpen(true);
        }
      } catch {
        if (alive) setHits([]);
      } finally {
        if (alive) setLoading(false);
      }
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [q]);

  // Dışarı tıklayınca dropdown kapansın.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function select(h: SearchPlayerHit) {
    onChange({ id: h.id, name: h.name, photo: h.photoUrl ?? null });
    setQ("");
    setHits([]);
    setOpen(false);
  }

  return (
    <div className="field" ref={boxRef} style={{ position: "relative" }}>
      <label>{label}</label>

      {value ? (
        <div className="player-chip">
          {value.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.photo} alt="" />
          ) : (
            <span className="player-chip-ph">{(value.name ?? "?").charAt(0)}</span>
          )}
          <span className="player-chip-name">{value.name ?? `#${value.id}`}</span>
          <button
            type="button"
            className="player-chip-x"
            onClick={() => onChange(null)}
            aria-label="Kaldır"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              opacity: 0.5,
            }}
          />
          <input
            className="input"
            style={{ paddingLeft: 32 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => hits.length > 0 && setOpen(true)}
            placeholder="Oyuncu ara (en az 2 harf)"
          />
          {open && (
            <div className="player-picker-menu">
              {loading && <div className="player-picker-empty">Aranıyor…</div>}
              {!loading && hits.length === 0 && (
                <div className="player-picker-empty">Sonuç yok.</div>
              )}
              {hits.map((h) => (
                <button
                  type="button"
                  key={h.id}
                  className="player-picker-item"
                  onClick={() => select(h)}
                >
                  {h.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={h.photoUrl} alt="" />
                  ) : (
                    <span className="player-chip-ph">{h.name.charAt(0)}</span>
                  )}
                  <span className="player-picker-item-name">
                    {h.name}
                    {h.nationality ? (
                      <small> · {h.nationality}</small>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
