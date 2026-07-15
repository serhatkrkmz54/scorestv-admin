"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Trash2,
  Swords,
  Rocket,
  Lock,
  Undo2,
} from "lucide-react";
import {
  apiGetCompetition,
  apiAddDuel,
  apiDeleteDuel,
  apiDeleteCompetition,
  apiUpdateCompetitionStatus,
  ApiError,
} from "@/lib/api-client";
import type {
  GameCompetitionView,
  GameDuelView,
  GameStatus,
  DuelPosition,
  DuelMetric,
  DuelDirection,
  GamePlayerRef,
  CreateDuelRequest,
} from "@/lib/types";
import PlayerPicker from "@/components/PlayerPicker";

const POSITION_TR: Record<DuelPosition, string> = {
  GK: "Kaleci",
  DEF: "Defans",
  MID: "Orta Saha",
  FWD: "Forvet",
};

const METRIC_TR: Record<DuelMetric, string> = {
  RATING: "Rating (ScoresTV Puanı)",
  GOALS: "Gol",
  ASSISTS: "Asist",
  KEY_PASSES: "Kilit Pas",
  ASSISTS_KEYPASS: "Asist + Kilit Pas",
  SHOTS_ON: "İsabetli Şut",
  SAVES: "Kurtarış",
  CLEAN_SHEET: "Gol Yemeden (clean sheet)",
  DUELS_WON: "Kazanılan İkili Mücadele",
  TACKLES_INT: "Top Çalma + Kesme",
  DRIBBLES: "Başarılı Çalım",
  CARDS: "Kart (az olan kazanır)",
  FOULS: "Faul (az olan kazanır)",
};

const METRIC_ORDER: DuelMetric[] = [
  "RATING",
  "GOALS",
  "ASSISTS",
  "KEY_PASSES",
  "ASSISTS_KEYPASS",
  "SHOTS_ON",
  "SAVES",
  "CLEAN_SHEET",
  "DUELS_WON",
  "TACKLES_INT",
  "DRIBBLES",
  "CARDS",
  "FOULS",
];

const STATUS_BADGE: Record<GameStatus, { label: string; cls: string }> = {
  DRAFT: { label: "Taslak", cls: "badge-draft" },
  OPEN: { label: "Açık", cls: "badge-published" },
  LOCKED: { label: "Kilitli", cls: "badge-scheduled" },
  RESOLVED: { label: "Çözüldü", cls: "badge-archived" },
};

function defaultDirection(m: DuelMetric): DuelDirection {
  return m === "CARDS" || m === "FOULS" ? "LOWER" : "HIGHER";
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function GameCompetitionClient({
  competitionId,
}: {
  competitionId: number;
}) {
  const router = useRouter();
  const [data, setData] = useState<GameCompetitionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Düello ekleme formu.
  const [position, setPosition] = useState<DuelPosition>("FWD");
  const [metric, setMetric] = useState<DuelMetric>("GOALS");
  const [direction, setDirection] = useState<DuelDirection>("HIGHER");
  const [playerA, setPlayerA] = useState<GamePlayerRef | null>(null);
  const [teamA, setTeamA] = useState("");
  const [playerB, setPlayerB] = useState<GamePlayerRef | null>(null);
  const [teamB, setTeamB] = useState("");
  const [adding, setAdding] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiGetCompetition(competitionId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Yarışma alınamadı.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(status: GameStatus) {
    setBusy(true);
    try {
      await apiUpdateCompetitionStatus(competitionId, status);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Durum güncellenemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function addDuel(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    if (!playerA || !playerB) {
      setFormErr("İki oyuncu da seçilmeli.");
      return;
    }
    if (playerA.id === playerB.id) {
      setFormErr("Aynı oyuncu iki tarafa konamaz.");
      return;
    }
    const payload: CreateDuelRequest = {
      position,
      metric,
      direction,
      playerA: { ...playerA, team: teamA.trim() || null },
      playerB: { ...playerB, team: teamB.trim() || null },
    };
    setAdding(true);
    try {
      await apiAddDuel(competitionId, payload);
      setPlayerA(null);
      setPlayerB(null);
      setTeamA("");
      setTeamB("");
      await load();
    } catch (err) {
      setFormErr(err instanceof ApiError ? err.message : "Düello eklenemedi.");
    } finally {
      setAdding(false);
    }
  }

  async function removeDuel(duelId: number) {
    if (!confirm("Bu düelloyu silmek istediğinize emin misiniz?")) return;
    setBusy(true);
    try {
      await apiDeleteDuel(duelId);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Silinemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCompetition() {
    if (!confirm("Yarışmayı ve tüm düellolarını silmek istediğinize emin misiniz?")) return;
    setBusy(true);
    try {
      await apiDeleteCompetition(competitionId);
      router.push("/game");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Silinemedi.");
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="card card-pad muted">Yükleniyor…</div>;
  }
  if (error || !data) {
    return (
      <div className="stack">
        <Link href="/game" className="btn btn-sm"><ArrowLeft size={14} /> Geri</Link>
        <div className="alert alert-error">{error ?? "Yarışma bulunamadı."}</div>
      </div>
    );
  }

  const b = STATUS_BADGE[data.status];
  const editable = data.status === "DRAFT" || data.status === "OPEN";

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <Link href="/game" className="btn btn-sm" style={{ marginBottom: 8 }}>
            <ArrowLeft size={14} /> Yarışmalar
          </Link>
          <h2 style={{ margin: "6px 0 0", fontSize: 20, display: "flex", gap: 10, alignItems: "center" }}>
            {data.title}
            <span className={`badge ${b.cls}`}>{b.label}</span>
          </h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Pencere {fmt(data.startAt)} → {fmt(data.endAt)} · Kilit {fmt(data.lockAt)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => load()} disabled={busy}>
            <RefreshCw size={16} /> Yenile
          </button>
          {data.status === "DRAFT" && (
            <button className="btn btn-success" onClick={() => setStatus("OPEN")} disabled={busy}>
              <Rocket size={16} /> Yayınla
            </button>
          )}
          {data.status === "OPEN" && (
            <button className="btn" onClick={() => setStatus("LOCKED")} disabled={busy}>
              <Lock size={16} /> Kilitle
            </button>
          )}
          {(data.status === "OPEN" || data.status === "LOCKED") && (
            <button className="btn btn-ghost" onClick={() => setStatus("DRAFT")} disabled={busy}>
              <Undo2 size={16} /> Taslağa al
            </button>
          )}
          <button className="btn btn-danger" onClick={removeCompetition} disabled={busy}>
            <Trash2 size={16} /> Sil
          </button>
        </div>
      </div>

      {/* Düello ekleme */}
      {editable ? (
        <form className="card card-pad" onSubmit={addDuel}>
          <div className="card-title" style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <Plus size={16} /> Düello Ekle
          </div>
          {formErr && <div className="alert alert-error" style={{ marginBottom: 12 }}>{formErr}</div>}
          <div className="form-grid">
            <div className="field">
              <label>Mevki</label>
              <select className="select" value={position} onChange={(e) => setPosition(e.target.value as DuelPosition)}>
                {(Object.keys(POSITION_TR) as DuelPosition[]).map((p) => (
                  <option key={p} value={p}>{POSITION_TR[p]}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>İstatistik</label>
              <select
                className="select"
                value={metric}
                onChange={(e) => {
                  const m = e.target.value as DuelMetric;
                  setMetric(m);
                  setDirection(defaultDirection(m));
                }}
              >
                {METRIC_ORDER.map((m) => (
                  <option key={m} value={m}>{METRIC_TR[m]}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Kazanan yön</label>
              <select className="select" value={direction} onChange={(e) => setDirection(e.target.value as DuelDirection)}>
                <option value="HIGHER">Yüksek olan kazanır</option>
                <option value="LOWER">Düşük olan kazanır</option>
              </select>
            </div>
          </div>

          <div className="form-grid" style={{ marginTop: 4 }}>
            <PlayerPicker label="Oyuncu A" value={playerA} onChange={setPlayerA} />
            <div className="field">
              <label>A takımı (opsiyonel)</label>
              <input className="input" value={teamA} onChange={(e) => setTeamA(e.target.value)} placeholder="ör. Galatasaray" />
            </div>
            <PlayerPicker label="Oyuncu B" value={playerB} onChange={setPlayerB} />
            <div className="field">
              <label>B takımı (opsiyonel)</label>
              <input className="input" value={teamB} onChange={(e) => setTeamB(e.target.value)} placeholder="ör. Fenerbahçe" />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? "Ekleniyor…" : "Düelloyu Ekle"}
            </button>
          </div>
        </form>
      ) : (
        <div className="alert alert-info">
          Yarışma {STATUS_BADGE[data.status].label.toLowerCase()} durumda — yeni düello eklemek için “Taslağa al”.
        </div>
      )}

      {/* Düello listesi */}
      <div className="stack">
        <div className="muted" style={{ fontSize: 13 }}>{data.duels.length} düello</div>
        {data.duels.length === 0 && (
          <div className="card card-pad muted">Henüz düello yok.</div>
        )}
        {data.duels.map((d) => (
          <DuelRow key={d.id} d={d} onDelete={() => removeDuel(d.id)} disabled={busy} />
        ))}
      </div>
    </div>
  );
}

function DuelRow({
  d,
  onDelete,
  disabled,
}: {
  d: GameDuelView;
  onDelete: () => void;
  disabled: boolean;
}) {
  const resolved = d.status === "RESOLVED";
  return (
    <div className="card card-pad">
      <div className="spread" style={{ alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
          <span className="badge badge-lang">{POSITION_TR[d.position]}</span>
          <span className="badge badge-draft">{METRIC_TR[d.metric]}</span>
          <span className="muted">{d.direction === "LOWER" ? "düşük kazanır" : "yüksek kazanır"}</span>
          {d.status === "VOID" && <span className="badge badge-archived">İptal</span>}
          {resolved && <span className="badge badge-published">Çözüldü</span>}
        </div>
        <button className="btn btn-icon btn-danger" onClick={onDelete} disabled={disabled} aria-label="Sil">
          <Trash2 size={14} />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
        <DuelSide p={d.playerA} value={d.valueA} picks={d.pickCountA} win={d.winner === "A"} resolved={resolved} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: 0.7 }}>
          <Swords size={18} />
          <small className="muted">VS</small>
        </div>
        <DuelSide p={d.playerB} value={d.valueB} picks={d.pickCountB} win={d.winner === "B"} resolved={resolved} />
      </div>
    </div>
  );
}

function DuelSide({
  p,
  value,
  picks,
  win,
  resolved,
}: {
  p: GameDuelView["playerA"];
  value: number | null;
  picks: number;
  win: boolean;
  resolved: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: 8,
        borderRadius: 10,
        border: win ? "1px solid var(--success)" : "1px solid transparent",
        background: win ? "var(--success-soft)" : "transparent",
      }}
    >
      {p.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.photo} alt="" width={40} height={40} style={{ borderRadius: "50%", objectFit: "cover" }} />
      ) : (
        <span className="player-chip-ph" style={{ width: 40, height: 40, fontSize: 16 }}>
          {(p.name ?? "?").charAt(0)}
        </span>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {p.name ?? `#${p.id}`}
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          {p.team ?? "—"} · {picks} tahmin
          {resolved && value != null && <> · <b>{value}</b></>}
        </div>
      </div>
    </div>
  );
}
