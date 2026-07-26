"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Inbox,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  User as UserIcon,
} from "lucide-react";
import {
  apiListContributions,
  apiContributionStats,
  apiApproveContribution,
  apiRejectContribution,
  ApiError,
} from "@/lib/api-client";
import type {
  AdminContribution,
  AdminContributionPage,
  ContributionStats,
  ContributionType,
} from "@/lib/types";

const PAGE_SIZE = 20;

const TYPE_TR: Record<ContributionType, string> = {
  SCORE: "Skor hatası",
  STATUS: "Durum / erteleme",
  LINEUP: "Kadro",
  TV_CHANNEL: "TV kanalı",
  NAME: "İsim / logo",
  MISSING_DATA: "Eksik veri",
  OTHER: "Diğer",
};

/** Tür → varsayılan onay puanı (backend ile aynı; bilgi amaçlı gösterim). */
const DEFAULT_POINTS: Record<ContributionType, number> = {
  SCORE: 15,
  STATUS: 10,
  LINEUP: 25,
  TV_CHANNEL: 10,
  NAME: 5,
  MISSING_DATA: 15,
  OTHER: 5,
};

const SPORT_TR: Record<AdminContribution["sport"], string> = {
  football: "Futbol",
  basketball: "Basketbol",
  volleyball: "Voleybol",
};

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function StatusBadge({ status }: { status: AdminContribution["status"] }) {
  if (status === "APPROVED")
    return (
      <span className="badge badge-published">
        <span className="badge-dot" /> Onaylandı
      </span>
    );
  if (status === "REJECTED")
    return (
      <span className="badge badge-flag">
        <span className="badge-dot" /> Reddedildi
      </span>
    );
  return (
    <span className="badge badge-scheduled">
      <span className="badge-dot" /> Bekliyor
    </span>
  );
}

export default function ContributionsClient() {
  const [stats, setStats] = useState<ContributionStats | null>(null);
  const [data, setData] = useState<AdminContributionPage | null>(null);
  const [status, setStatus] = useState<"" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  /** Satır bazlı puan/not girişleri. */
  const [forms, setForms] = useState<Record<number, { points: string; note: string }>>({});

  const refreshStats = useCallback(() => {
    apiContributionStats().then(setStats).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiListContributions({ status: status || undefined, page, size: PAGE_SIZE }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Katkılar alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(refreshStats, [refreshStats]);

  useEffect(() => {
    setPage(0);
  }, [status]);

  function formOf(c: AdminContribution) {
    return forms[c.id] ?? { points: String(DEFAULT_POINTS[c.type] ?? 5), note: "" };
  }
  function setForm(id: number, patch: Partial<{ points: string; note: string }>) {
    setForms((f) => ({ ...f, [id]: { ...f[id], points: formOfId(id, f).points, note: formOfId(id, f).note, ...patch } }));
  }
  function formOfId(id: number, f: Record<number, { points: string; note: string }>) {
    return f[id] ?? { points: "", note: "" };
  }

  function patchRow(updated: AdminContribution) {
    setData((d) =>
      d ? { ...d, content: d.content.map((c) => (c.id === updated.id ? updated : c)) } : d,
    );
  }

  async function approve(c: AdminContribution) {
    const form = formOf(c);
    const points = Number(form.points);
    if (!Number.isFinite(points) || points < 0) {
      setMsg("Geçerli bir puan gir (0 = puansız onay).");
      return;
    }
    setBusyId(c.id);
    setMsg(null);
    try {
      patchRow(await apiApproveContribution(c.id, Math.round(points), form.note.trim() || undefined));
      setMsg(`#${c.id} onaylandı — ${c.userDisplayName || c.userEmail} +${Math.round(points)} puan kazandı.`);
      refreshStats();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Onay başarısız.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(c: AdminContribution) {
    const form = formOf(c);
    setBusyId(c.id);
    setMsg(null);
    try {
      patchRow(await apiRejectContribution(c.id, form.note.trim() || undefined));
      setMsg(`#${c.id} reddedildi.`);
      refreshStats();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Red başarısız.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="stack">
      <div>
        <h2 style={{ margin: 0, fontSize: 20, display: "flex", gap: 8, alignItems: "center" }}>
          <Inbox size={20} /> Katkı Kuyruğu
        </h2>
        <div className="muted" style={{ fontSize: 13 }}>
          Kullanıcı hata bildirimleri ve veri önerileri. Onay yalnız kaydı işaretler ve
          Scores Puanı verir — <b>API&apos;den akan veriye dokunmaz</b>; gereken düzeltme ayrıca yapılır.
        </div>
      </div>

      {/* Sayaçlar */}
      {stats && (
        <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="stat-card">
            <div>
              <div className="stat-label">Bekleyen</div>
              <div className="stat-value">{stats.pending}</div>
            </div>
            <div className="stat-icon warning">
              <Inbox size={22} />
            </div>
          </div>
          <div className="stat-card">
            <div>
              <div className="stat-label">Onaylanan</div>
              <div className="stat-value">{stats.approved}</div>
            </div>
            <div className="stat-icon success">
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div className="stat-card">
            <div>
              <div className="stat-label">Reddedilen</div>
              <div className="stat-value">{stats.rejected}</div>
            </div>
            <div className="stat-icon neutral">
              <XCircle size={22} />
            </div>
          </div>
        </div>
      )}

      {/* Durum filtresi */}
      <div className="card card-pad" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {(["PENDING", "APPROVED", "REJECTED", ""] as const).map((s) => (
          <button
            key={s || "ALL"}
            className={`btn btn-sm ${status === s ? "btn-primary" : ""}`}
            onClick={() => setStatus(s)}
          >
            {s === "PENDING" ? "Bekleyen" : s === "APPROVED" ? "Onaylanan" : s === "REJECTED" ? "Reddedilen" : "Tümü"}
          </button>
        ))}
      </div>

      {msg && <div className="alert alert-info">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading && !data && <div className="state-box">Yükleniyor…</div>}
      {data && data.content.length === 0 && (
        <div className="card card-pad">
          <div className="state-box">Bu filtrede katkı yok. 🎉</div>
        </div>
      )}

      {/* Katkı kartları */}
      {data?.content.map((c) => {
        const form = formOf(c);
        const pending = c.status === "PENDING";
        return (
          <div key={c.id} className="card card-pad">
            <div className="spread" style={{ alignItems: "flex-start", gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span className="badge badge-lang">{TYPE_TR[c.type] ?? c.type}</span>
                  <span className="badge badge-draft">{SPORT_TR[c.sport] ?? c.sport}</span>
                  <StatusBadge status={c.status} />
                  <span className="muted" style={{ fontSize: 12 }}>
                    #{c.id} · {fmtDate(c.createdAt)}
                  </span>
                </div>
                {c.targetLabel && (
                  <div style={{ fontWeight: 600, marginTop: 8 }}>
                    {c.targetLabel}
                    {c.targetId ? (
                      <span className="muted" style={{ fontWeight: 400 }}>
                        {" "}
                        ({c.targetType.toLowerCase()} #{c.targetId})
                      </span>
                    ) : null}
                  </div>
                )}
                <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{c.message}</div>
                {c.suggestedValue && (
                  <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                    Önerilen değer: <b>{c.suggestedValue}</b>
                  </div>
                )}
                <div
                  className="muted"
                  style={{ marginTop: 10, fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}
                >
                  <UserIcon size={13} />
                  {c.userDisplayName || "—"} · {c.userEmail}
                  <span
                    title="Bu kullanıcının geçmiş karnesi"
                    className="badge badge-draft"
                    style={{ marginLeft: 4 }}
                  >
                    ✓{c.userApproved} · ✗{c.userRejected}
                  </span>
                </div>
                {!pending && (
                  <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                    {c.status === "APPROVED" ? `+${c.pointsAwarded} puan verildi.` : "Puan verilmedi."}
                    {c.reviewNote ? ` Not: ${c.reviewNote}` : ""}
                  </div>
                )}
              </div>
            </div>

            {pending && (
              <div
                className="form-grid"
                style={{ marginTop: 14, gridTemplateColumns: "110px 1fr auto auto", gap: 10 }}
              >
                <div className="field" style={{ margin: 0 }}>
                  <label>
                    <Star size={11} style={{ verticalAlign: -1 }} /> Puan
                  </label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={form.points}
                    onChange={(e) => setForm(c.id, { points: e.target.value })}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Not (kullanıcı görür, opsiyonel)</label>
                  <input
                    className="input"
                    value={form.note}
                    onChange={(e) => setForm(c.id, { note: e.target.value })}
                    placeholder="ör. Teşekkürler, düzeltildi!"
                  />
                </div>
                <div className="field" style={{ margin: 0, display: "flex", alignItems: "flex-end" }}>
                  <button
                    className="btn btn-success"
                    disabled={busyId === c.id}
                    onClick={() => approve(c)}
                  >
                    <CheckCircle2 size={15} /> Onayla
                  </button>
                </div>
                <div className="field" style={{ margin: 0, display: "flex", alignItems: "flex-end" }}>
                  <button
                    className="btn btn-danger"
                    disabled={busyId === c.id}
                    onClick={() => reject(c)}
                  >
                    <XCircle size={15} /> Reddet
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Sayfalama */}
      {data && data.totalPages > 1 && (
        <div className="card">
          <div className="pagination">
            <span>
              {data.totalElements} kayıt · sayfa {data.page + 1} / {data.totalPages}
            </span>
            <div className="pages">
              <button
                className="btn btn-sm"
                disabled={data.first || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft size={14} /> Önceki
              </button>
              <button
                className="btn btn-sm"
                disabled={data.last || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Sonraki <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
