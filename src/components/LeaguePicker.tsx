"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { apiSearchLeagues } from "@/lib/api-client";
import type { LeagueGuideRow } from "@/lib/types";

/**
 * Lig REHBERİ/seçici — ada, ülkeye ya da doğrudan ID'ye göre arar; her satırda
 * ID + güncel sezon + ülke görünür. Seçince ID ve güncel sezon forma dolar
 * (elle ID ezberlemeye son). PlayerPicker ile aynı desen.
 */
export default function LeaguePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LeagueGuideRow | null;
  onChange: (l: LeagueGuideRow | null) => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<LeagueGuideRow[]>([]);
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
        const res = await apiSearchLeagues(term);
        if (alive) {
          setHits(res);
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

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function select(l: LeagueGuideRow) {
    onChange(l);
    setQ("");
    setHits([]);
    setOpen(false);
  }

  return (
    <div className="field" ref={boxRef} style={{ position: "relative" }}>
      <label>{label}</label>

      {value ? (
        <div className="player-chip">
          {value.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.logo} alt="" />
          ) : (
            <span className="player-chip-ph">{value.name.charAt(0)}</span>
          )}
          <span className="player-chip-name">
            {value.name}
            <small className="muted">
              {" "}· ID {value.id}
              {value.currentSeason ? ` · sezon ${value.currentSeason}` : ""}
            </small>
          </span>
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
            placeholder="Lig ara — ad, ülke ya da ID (ör. Champions, 2)"
          />
          {open && (
            <div className="player-picker-menu">
              {loading && <div className="player-picker-empty">Aranıyor…</div>}
              {!loading && hits.length === 0 && (
                <div className="player-picker-empty">Sonuç yok.</div>
              )}
              {hits.map((l) => (
                <button
                  type="button"
                  key={l.id}
                  className="player-picker-item"
                  onClick={() => select(l)}
                >
                  {l.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.logo} alt="" />
                  ) : (
                    <span className="player-chip-ph">{l.name.charAt(0)}</span>
                  )}
                  <span className="player-picker-item-name">
                    {l.name}
                    <small>
                      {" "}· ID {l.id}
                      {l.country ? ` · ${l.country}` : ""}
                      {l.currentSeason ? ` · sezon ${l.currentSeason}` : ""}
                    </small>
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
