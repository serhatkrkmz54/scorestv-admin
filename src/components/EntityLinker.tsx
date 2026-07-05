"use client";

import { useEffect, useRef, useState } from "react";
import { apiSearch } from "@/lib/api-client";
import type { EntityChip, EntityKind, SearchResponse } from "@/lib/types";

const KIND_LABELS: Record<EntityKind, string> = {
  team: "Takım",
  league: "Lig",
  player: "Oyuncu",
  country: "Ülke",
};

/**
 * Varlık bağlama bileşeni. Debounce'lu (250ms) arama → /api/search. Sonuçlar
 * tipe göre gruplu listelenir; tıklanınca çip eklenir. Çipler kaldırılabilir.
 * value: seçili çipler; onChange: güncel çip listesi. Form bunu teamIds/
 * leagueIds/countryIds/playerIds'e dönüştürür.
 */
export default function EntityLinker({
  value,
  onChange,
}: {
  value: EntityChip[];
  onChange: (chips: EntityChip[]) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced search.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await apiSearch(term, "team,league,player,country");
        setResults(res);
        setOpen(true);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  // Dışa tıklayınca kapat.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function has(kind: EntityKind, id: number): boolean {
    return value.some((c) => c.kind === kind && c.id === id);
  }

  function add(chip: EntityChip) {
    if (has(chip.kind, chip.id)) return;
    onChange([...value, chip]);
    setQ("");
    setResults(null);
    setOpen(false);
  }

  function remove(kind: EntityKind, id: number) {
    onChange(value.filter((c) => !(c.kind === kind && c.id === id)));
  }

  const teams = results?.teams ?? [];
  const leagues = results?.leagues ?? [];
  const players = results?.players ?? [];
  const countries = results?.countries ?? [];
  const anyResults =
    teams.length + leagues.length + players.length + countries.length > 0;

  return (
    <div className="linker" ref={boxRef}>
      <input
        className="input"
        placeholder="Takım, lig, oyuncu veya ülke ara..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results && setOpen(true)}
      />

      {open && (loading || results) && (
        <div className="linker-results">
          {loading && <div className="linker-opt muted">Aranıyor...</div>}
          {!loading && !anyResults && (
            <div className="linker-opt muted">Sonuç bulunamadı.</div>
          )}

          {teams.length > 0 && (
            <>
              <div className="linker-group-title">{KIND_LABELS.team}</div>
              {teams.slice(0, 8).map((t) => (
                <div
                  key={`t-${t.id}`}
                  className="linker-opt"
                  onClick={() =>
                    add({
                      kind: "team",
                      id: t.id,
                      name: t.nameTr || t.name,
                      logo: t.logoUrl,
                    })
                  }
                >
                  {t.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="linker-logo" src={t.logoUrl} alt="" />
                  ) : (
                    <span className="linker-logo" />
                  )}
                  <span>{t.nameTr || t.name}</span>
                  {t.country && <span className="muted">— {t.countryTr || t.country}</span>}
                </div>
              ))}
            </>
          )}

          {leagues.length > 0 && (
            <>
              <div className="linker-group-title">{KIND_LABELS.league}</div>
              {leagues.slice(0, 8).map((l) => (
                <div
                  key={`l-${l.id}`}
                  className="linker-opt"
                  onClick={() =>
                    add({
                      kind: "league",
                      id: l.id,
                      name: l.nameTr || l.name,
                      logo: l.logoUrl,
                    })
                  }
                >
                  {l.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="linker-logo" src={l.logoUrl} alt="" />
                  ) : (
                    <span className="linker-logo" />
                  )}
                  <span>{l.nameTr || l.name}</span>
                  {l.country && <span className="muted">— {l.countryTr || l.country}</span>}
                </div>
              ))}
            </>
          )}

          {players.length > 0 && (
            <>
              <div className="linker-group-title">{KIND_LABELS.player}</div>
              {players.slice(0, 8).map((p) => (
                <div
                  key={`p-${p.id}`}
                  className="linker-opt"
                  onClick={() =>
                    add({ kind: "player", id: p.id, name: p.name, logo: p.photoUrl })
                  }
                >
                  {p.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="linker-logo" src={p.photoUrl} alt="" />
                  ) : (
                    <span className="linker-logo" />
                  )}
                  <span>{p.name}</span>
                  {p.nationality && <span className="muted">— {p.nationality}</span>}
                </div>
              ))}
            </>
          )}

          {countries.length > 0 && (
            <>
              <div className="linker-group-title">{KIND_LABELS.country}</div>
              {countries.slice(0, 8).map((c) => (
                <div
                  key={`c-${c.id}`}
                  className="linker-opt"
                  onClick={() =>
                    add({
                      kind: "country",
                      id: c.id,
                      name: c.nameTr || c.name,
                      logo: c.flagUrl,
                    })
                  }
                >
                  {c.flagUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="linker-logo" src={c.flagUrl} alt="" />
                  ) : (
                    <span className="linker-logo" />
                  )}
                  <span>{c.nameTr || c.name}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {value.length > 0 && (
        <div className="chips">
          {value.map((c) => (
            <span key={`${c.kind}-${c.id}`} className="chip">
              {c.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logo} alt="" />
              ) : null}
              <span className="kind">{KIND_LABELS[c.kind]}</span>
              <span>{c.name}</span>
              <button
                type="button"
                className="chip-x"
                onClick={() => remove(c.kind, c.id)}
                aria-label="Kaldır"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
