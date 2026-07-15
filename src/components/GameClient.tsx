"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Settings2, Trophy } from "lucide-react";
import {
  apiListCompetitions,
  apiCreateCompetition,
  ApiError,
} from "@/lib/api-client";
import type {
  GameCompetitionItem,
  GameScope,
  GameStatus,
  CreateCompetitionRequest,
} from "@/lib/types";

const SCOPE_TR: Record<GameScope, string> = {
  WEEKLY: "Haftalık",
  MONTHLY: "Aylık",
  SEASON: "Sezonluk",
};

const STATUS_BADGE: Record<GameStatus, { label: string; cls: string }> = {
  DRAFT: { label: "Taslak", cls: "badge-draft" },
  OPEN: { label: "Açık", cls: "badge-published" },
  LOCKED: { label: "Kilitli", cls: "badge-scheduled" },
  RESOLVED: { label: "Çözüldü", cls: "badge-archived" },
};

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

// datetime-local ("YYYY-MM-DDTHH:mm", yerel) → ISO Instant.
function toIso(local: string): string {
  return new Date(local).toISOString();
}

// Şimdi + n gün, datetime-local formatında (yerel saat).
function localPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function GameClient() {
  const router = useRouter();
  const [list, setList] = useState<GameCompetitionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [scope, setScope] = useState<GameScope>("WEEKLY");
  const [title, setTitle] = useState("");
  const [season, setSeason] = useState("");
  const [leagueId, setLeagueId] = useState("");
  const [startAt, setStartAt] = useState(localPlusDays(0));
  const [endAt, setEndAt] = useState(localPlusDays(7));
  const [lockAt, setLockAt] = useState(localPlusDays(1));
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setList(await apiListCompetitions());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Yarışmalar alınamadı.");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    if (!title.trim()) {
      setFormErr("Başlık gerekli.");
      return;
    }
    const payload: CreateCompetitionRequest = {
      scope,
      title: title.trim(),
      season: season ? Number(season) : null,
      leagueId: leagueId ? Number(leagueId) : null,
      startAt: toIso(startAt),
      endAt: toIso(endAt),
      lockAt: toIso(lockAt),
    };
    setSaving(true);
    try {
      const created = await apiCreateCompetition(payload);
      // Yeni yarışma taslak olarak oluşur → düello eklemek için detaya git.
      router.push(`/game/${created.id}`);
    } catch (err) {
      setFormErr(err instanceof ApiError ? err.message : "Oluşturulamadı.");
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2 style={{ margin: 0, fontSize: 20, display: "flex", gap: 8, alignItems: "center" }}>
            <Trophy size={20} /> Oyun · Düello Yarışmaları
          </h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Scores Coin — aynı mevkiden iki oyuncu bir istatistikte kapışır.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => load()} disabled={loading}>
            <RefreshCw size={16} /> Yenile
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} /> Yeni Yarışma
          </button>
        </div>
      </div>

      {showForm && (
        <form className="card card-pad" onSubmit={create}>
          <div className="card-title" style={{ marginBottom: 12 }}>Yeni Yarışma</div>
          {formErr && <div className="alert alert-error" style={{ marginBottom: 12 }}>{formErr}</div>}
          <div className="form-grid">
            <div className="field">
              <label>Kapsam</label>
              <select className="select" value={scope} onChange={(e) => setScope(e.target.value as GameScope)}>
                <option value="WEEKLY">Haftalık</option>
                <option value="MONTHLY">Aylık</option>
                <option value="SEASON">Sezonluk</option>
              </select>
            </div>
            <div className="field">
              <label>Başlık</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ör. Bu Haftanın Kaleci Düellosu" />
            </div>
            <div className="field">
              <label>Sezon (opsiyonel)</label>
              <input className="input" type="number" value={season} onChange={(e) => setSeason(e.target.value)} placeholder="2025" />
            </div>
            <div className="field">
              <label>Lig ID (opsiyonel)</label>
              <input className="input" type="number" value={leagueId} onChange={(e) => setLeagueId(e.target.value)} placeholder="lig-bazlı yarışma için" />
            </div>
            <div className="field">
              <label>Pencere başı (start)</label>
              <input className="input" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </div>
            <div className="field">
              <label>Pencere sonu (end)</label>
              <input className="input" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </div>
            <div className="field">
              <label>Tahmin kilidi (lock)</label>
              <input className="input" type="datetime-local" value={lockAt} onChange={(e) => setLockAt(e.target.value)} />
            </div>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Pencere = istatistiklerin toplanacağı maç aralığı. Kilitten sonra kullanıcılar tahmin veremez.
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Vazgeç</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Oluşturuluyor…" : "Oluştur ve Düello Ekle"}
            </button>
          </div>
        </form>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Başlık</th>
                <th>Kapsam</th>
                <th>Durum</th>
                <th>Pencere</th>
                <th>Kilit</th>
                <th style={{ textAlign: "right" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="muted" style={{ padding: 20 }}>Yükleniyor…</td></tr>
              )}
              {!loading && list.length === 0 && (
                <tr><td colSpan={6} className="muted" style={{ padding: 20 }}>Henüz yarışma yok. “Yeni Yarışma” ile başla.</td></tr>
              )}
              {list.map((c) => {
                const b = STATUS_BADGE[c.status];
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/game/${c.id}`} style={{ fontWeight: 600 }}>{c.title}</Link>
                    </td>
                    <td>{SCOPE_TR[c.scope]}</td>
                    <td><span className={`badge ${b.cls}`}>{b.label}</span></td>
                    <td className="muted" style={{ fontSize: 12 }}>{fmt(c.startAt)} → {fmt(c.endAt)}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{fmt(c.lockAt)}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/game/${c.id}`} className="btn btn-sm">
                        <Settings2 size={14} /> Yönet
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
