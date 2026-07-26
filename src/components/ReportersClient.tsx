"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Radio,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  MapPin,
} from "lucide-react";
import {
  apiListReporterApplications,
  apiApproveReporterApplication,
  apiRejectReporterApplication,
  ApiError,
} from "@/lib/api-client";
import type {
  AdminReporterApplication,
  AdminReporterApplicationPage,
} from "@/lib/types";

const PAGE_SIZE = 20;

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

function StatusBadge({ status }: { status: AdminReporterApplication["status"] }) {
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

export default function ReportersClient() {
  const [data, setData] = useState<AdminReporterApplicationPage | null>(null);
  const [status, setStatus] = useState<"" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await apiListReporterApplications({
          status: status || undefined,
          page,
          size: PAGE_SIZE,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Başvurular alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [status]);

  function patchRow(updated: AdminReporterApplication) {
    setData((d) =>
      d ? { ...d, content: d.content.map((a) => (a.id === updated.id ? updated : a)) } : d,
    );
  }

  async function approve(a: AdminReporterApplication) {
    if (
      !window.confirm(
        `"${a.leagueName}" ligi oluşturulacak ve ${a.userDisplayName || a.userEmail} bu lige muhabir olarak atanacak. Onaylıyor musunuz?`,
      )
    ) {
      return;
    }
    setBusyId(a.id);
    setMsg(null);
    try {
      patchRow(await apiApproveReporterApplication(a.id, notes[a.id]?.trim() || undefined));
      setMsg(`#${a.id} onaylandı — "${a.leagueName}" ligi oluşturuldu, muhabir atandı.`);
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Onay başarısız.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(a: AdminReporterApplication) {
    setBusyId(a.id);
    setMsg(null);
    try {
      patchRow(await apiRejectReporterApplication(a.id, notes[a.id]?.trim() || undefined));
      setMsg(`#${a.id} reddedildi.`);
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
          <Radio size={20} /> Muhabir Başvuruları
        </h2>
        <div className="muted" style={{ fontSize: 13 }}>
          Saha Muhabiri programı: kullanıcılar API kapsamı dışındaki ligleri girmek için
          başvurur. Onay, <b>manuel ligi oluşturur ve muhabiri atar</b> — API verisine
          hiçbir etkisi yoktur. Muhabir her tamamlanan maç için Scores Puanı kazanır.
        </div>
      </div>

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
          <div className="state-box">Bu filtrede başvuru yok.</div>
        </div>
      )}

      {data?.content.map((a) => {
        const pending = a.status === "PENDING";
        return (
          <div key={a.id} className="card card-pad">
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{a.leagueName}</span>
              {a.region && (
                <span className="muted" style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 12.5 }}>
                  <MapPin size={12} /> {a.region}
                </span>
              )}
              <StatusBadge status={a.status} />
              <span className="muted" style={{ fontSize: 12 }}>
                #{a.id} · {fmtDate(a.createdAt)}
              </span>
              {a.leagueId && (
                <span className="badge badge-lang">lig #{a.leagueId}</span>
              )}
            </div>
            <div style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 13.5 }}>{a.message}</div>
            <div
              className="muted"
              style={{ marginTop: 8, fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}
            >
              <UserIcon size={13} />
              {a.userDisplayName || "—"} · {a.userEmail}
            </div>
            {!pending && a.reviewNote && (
              <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                Not: {a.reviewNote}
              </div>
            )}

            {pending && (
              <div
                className="form-grid"
                style={{ marginTop: 12, gridTemplateColumns: "1fr auto auto", gap: 10 }}
              >
                <div className="field" style={{ margin: 0 }}>
                  <label>Not (kullanıcı görür, opsiyonel)</label>
                  <input
                    className="input"
                    value={notes[a.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [a.id]: e.target.value }))}
                    placeholder="ör. Hoş geldin! Fikstürü girmeye başlayabilirsin."
                  />
                </div>
                <div className="field" style={{ margin: 0, display: "flex", alignItems: "flex-end" }}>
                  <button className="btn btn-success" disabled={busyId === a.id} onClick={() => approve(a)}>
                    <CheckCircle2 size={15} /> Onayla + Lig Oluştur
                  </button>
                </div>
                <div className="field" style={{ margin: 0, display: "flex", alignItems: "flex-end" }}>
                  <button className="btn btn-danger" disabled={busyId === a.id} onClick={() => reject(a)}>
                    <XCircle size={15} /> Reddet
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {data && data.totalPages > 1 && (
        <div className="card">
          <div className="pagination">
            <span>
              {data.totalElements} başvuru · sayfa {data.page + 1} / {data.totalPages}
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
