"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Search,
  ShieldCheck,
  Ban,
  CheckCircle2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Globe,
  KeyRound,
  Apple,
  Chrome,
} from "lucide-react";
import {
  apiListAppUsers,
  apiAppUserStats,
  apiSetAppUserEnabled,
  apiSetAppUserRole,
  apiLogoutAllAppUser,
  ApiError,
} from "@/lib/api-client";
import type {
  AdminAppUser,
  AdminAppUserPage,
  AdminAppUserStats,
} from "@/lib/types";

const PAGE_SIZE = 20;

const ROLE_TR: Record<AdminAppUser["role"], string> = {
  ADMIN: "Süper Admin",
  EDITOR: "Editör",
  USER: "Üye",
};

function initialsOf(u: AdminAppUser): string {
  return (u.displayName || u.email)
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function ProviderBadge({ provider }: { provider: AdminAppUser["provider"] }) {
  if (provider === "google") {
    return (
      <span className="badge badge-lang">
        <Chrome size={11} /> Google
      </span>
    );
  }
  if (provider === "apple") {
    return (
      <span className="badge badge-archived">
        <Apple size={11} /> Apple
      </span>
    );
  }
  return (
    <span className="badge badge-draft">
      <KeyRound size={11} /> E-posta
    </span>
  );
}

function RoleBadgeSelect({
  user,
  meId,
  busy,
  onChange,
}: {
  user: AdminAppUser;
  meId: number;
  busy: boolean;
  onChange: (role: AdminAppUser["role"]) => void;
}) {
  // Admin kendi rolünü değiştiremez (backend de engeller) — salt okunur rozet.
  if (user.id === meId) {
    return <span className="badge badge-published">{ROLE_TR[user.role]}</span>;
  }
  return (
    <select
      className="input"
      style={{ width: 130, padding: "6px 8px", fontSize: 12.5 }}
      value={user.role}
      disabled={busy}
      onChange={(e) => onChange(e.target.value as AdminAppUser["role"])}
    >
      <option value="USER">Üye</option>
      <option value="EDITOR">Editör</option>
      <option value="ADMIN">Süper Admin</option>
    </select>
  );
}

export default function UsersClient({ meId }: { meId: number }) {
  const [stats, setStats] = useState<AdminAppUserStats | null>(null);
  const [data, setData] = useState<AdminAppUserPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Filtreler
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"" | "USER" | "EDITOR" | "ADMIN">("");
  const [enabled, setEnabled] = useState<"" | "true" | "false">("");
  const [provider, setProvider] = useState<"" | "google" | "apple" | "local">("");
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiListAppUsers({
        query: q.trim() || undefined,
        role,
        enabled,
        provider,
        page,
        size: PAGE_SIZE,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Üyeler alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [q, role, enabled, provider, page]);

  // Arama debounce'lu; filtre/sayfa değişimi anında.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    apiAppUserStats().then(setStats).catch(() => {});
  }, []);

  // Filtre değişince ilk sayfaya dön.
  useEffect(() => {
    setPage(0);
  }, [q, role, enabled, provider]);

  const patchRow = useCallback((updated: AdminAppUser) => {
    setData((d) =>
      d
        ? { ...d, content: d.content.map((u) => (u.id === updated.id ? updated : u)) }
        : d,
    );
  }, []);

  async function toggleEnabled(u: AdminAppUser) {
    const target = !u.enabled;
    if (
      !target &&
      !window.confirm(
        `${u.displayName || u.email} hesabı devre dışı bırakılacak ve tüm oturumları sonlandırılacak. Emin misiniz?`,
      )
    ) {
      return;
    }
    setBusyId(u.id);
    setMsg(null);
    try {
      patchRow(await apiSetAppUserEnabled(u.id, target));
      setMsg(
        `${u.displayName || u.email} ${target ? "aktifleştirildi" : "devre dışı bırakıldı"}.`,
      );
      apiAppUserStats().then(setStats).catch(() => {});
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "İşlem başarısız.");
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(u: AdminAppUser, newRole: AdminAppUser["role"]) {
    if (
      newRole === "ADMIN" &&
      !window.confirm(
        `${u.displayName || u.email} SÜPER ADMIN yapılacak — panel ve tüm yönetim uçlarına tam erişim kazanır. Emin misiniz?`,
      )
    ) {
      return;
    }
    setBusyId(u.id);
    setMsg(null);
    try {
      patchRow(await apiSetAppUserRole(u.id, newRole));
      setMsg(`${u.displayName || u.email} rolü ${ROLE_TR[newRole]} olarak güncellendi.`);
      apiAppUserStats().then(setStats).catch(() => {});
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Rol güncellenemedi.");
    } finally {
      setBusyId(null);
    }
  }

  async function logoutAll(u: AdminAppUser) {
    if (
      !window.confirm(
        `${u.displayName || u.email} üyesinin tüm oturumları sonlandırılacak (tüm cihazlardan çıkış). Emin misiniz?`,
      )
    ) {
      return;
    }
    setBusyId(u.id);
    setMsg(null);
    try {
      const res = await apiLogoutAllAppUser(u.id);
      setMsg(
        `${u.displayName || u.email}: ${res.revokedSessions} oturum sonlandırıldı.`,
      );
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Oturumlar sonlandırılamadı.");
    } finally {
      setBusyId(null);
    }
  }

  const totalLabel = useMemo(() => {
    if (!data) return "";
    const from = data.page * data.size + 1;
    const to = data.page * data.size + data.content.length;
    return `${from}–${to} / ${data.totalElements}`;
  }, [data]);

  return (
    <div className="stack">
      <div>
        <h2 style={{ margin: 0, fontSize: 20, display: "flex", gap: 8, alignItems: "center" }}>
          <Users size={20} /> Üyeler
        </h2>
        <div className="muted" style={{ fontSize: 13 }}>
          Tüm kayıtlı üyeleri görüntüle, ara ve yönet — rol, durum, oturumlar.
        </div>
      </div>

      {/* İstatistik kartları */}
      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div>
              <div className="stat-label">Toplam Üye</div>
              <div className="stat-value">{stats.total.toLocaleString("tr-TR")}</div>
              <div className="stat-hint up">son 7 günde +{stats.newLast7Days}</div>
            </div>
            <div className="stat-icon">
              <Users size={22} />
            </div>
          </div>
          <div className="stat-card">
            <div>
              <div className="stat-label">Aktif</div>
              <div className="stat-value">{stats.enabled.toLocaleString("tr-TR")}</div>
              <div className="stat-hint">giriş yapabilir</div>
            </div>
            <div className="stat-icon success">
              <UserCheck size={22} />
            </div>
          </div>
          <div className="stat-card">
            <div>
              <div className="stat-label">Devre Dışı</div>
              <div className="stat-value">{stats.disabled.toLocaleString("tr-TR")}</div>
              <div className="stat-hint">engellenmiş hesap</div>
            </div>
            <div className="stat-icon warning">
              <UserX size={22} />
            </div>
          </div>
          <div className="stat-card">
            <div>
              <div className="stat-label">Kayıt Kaynağı</div>
              <div className="stat-value" style={{ fontSize: 16, lineHeight: 1.5 }}>
                {stats.google.toLocaleString("tr-TR")} Google ·{" "}
                {stats.apple.toLocaleString("tr-TR")} Apple
                <br />
                {stats.local.toLocaleString("tr-TR")} E-posta
              </div>
            </div>
            <div className="stat-icon neutral">
              <UserPlus size={22} />
            </div>
          </div>
        </div>
      )}

      {/* Filtre çubuğu */}
      <div className="card card-pad">
        <div
          className="form-grid"
          style={{ gridTemplateColumns: "1fr 150px 150px 150px", gap: 12, margin: 0 }}
        >
          <div className="field" style={{ position: "relative", margin: 0 }}>
            <Search
              size={16}
              style={{ position: "absolute", left: 10, top: 12, opacity: 0.5 }}
            />
            <input
              className="input"
              style={{ paddingLeft: 32 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="E-posta veya ad ara…"
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
            >
              <option value="">Tüm roller</option>
              <option value="USER">Üye</option>
              <option value="EDITOR">Editör</option>
              <option value="ADMIN">Süper Admin</option>
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <select
              className="input"
              value={enabled}
              onChange={(e) => setEnabled(e.target.value as typeof enabled)}
            >
              <option value="">Tüm durumlar</option>
              <option value="true">Aktif</option>
              <option value="false">Devre dışı</option>
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <select
              className="input"
              value={provider}
              onChange={(e) => setProvider(e.target.value as typeof provider)}
            >
              <option value="">Tüm kaynaklar</option>
              <option value="google">Google</option>
              <option value="apple">Apple</option>
              <option value="local">E-posta</option>
            </select>
          </div>
        </div>
      </div>

      {msg && <div className="alert alert-info">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Üye tablosu */}
      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Üye</th>
                <th>Kaynak</th>
                <th>Ülke</th>
                <th>Kayıt</th>
                <th>Rol</th>
                <th>Durum</th>
                <th style={{ textAlign: "right" }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={7}>
                    <div className="state-box">Yükleniyor…</div>
                  </td>
                </tr>
              ) : !data || data.content.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="state-box">Eşleşen üye bulunamadı.</div>
                  </td>
                </tr>
              ) : (
                data.content.map((u) => (
                  <tr key={u.id} style={u.enabled ? undefined : { opacity: 0.6 }}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          className="avatar"
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            display: "grid",
                            placeItems: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            background: "var(--tint)",
                            color: "var(--brand)",
                            flexShrink: 0,
                          }}
                        >
                          {initialsOf(u)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="cell-title" style={{ maxWidth: 260 }}>
                            {u.displayName || "—"}
                            {u.id === meId && (
                              <span className="muted" style={{ fontWeight: 400 }}> (siz)</span>
                            )}
                          </div>
                          <div className="cell-sub">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <ProviderBadge provider={u.provider} />
                    </td>
                    <td>
                      {u.country ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Globe size={12} style={{ opacity: 0.5 }} /> {u.country}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="cell-sub">{fmtDate(u.createdAt)}</td>
                    <td>
                      <RoleBadgeSelect
                        user={u}
                        meId={meId}
                        busy={busyId === u.id}
                        onChange={(r) => changeRole(u, r)}
                      />
                    </td>
                    <td>
                      {u.enabled ? (
                        <span className="badge badge-published">
                          <span className="badge-dot" /> Aktif
                        </span>
                      ) : (
                        <span className="badge badge-flag">
                          <span className="badge-dot" /> Devre dışı
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        {u.id !== meId && (
                          <>
                            <button
                              className={`btn ${u.enabled ? "btn-danger" : "btn-success"}`}
                              title={u.enabled ? "Devre dışı bırak" : "Aktifleştir"}
                              disabled={busyId === u.id}
                              onClick={() => toggleEnabled(u)}
                            >
                              {u.enabled ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                            </button>
                            <button
                              className="btn"
                              title="Tüm oturumları sonlandır"
                              disabled={busyId === u.id}
                              onClick={() => logoutAll(u)}
                            >
                              <LogOut size={14} />
                            </button>
                          </>
                        )}
                        {u.id === meId && (
                          <span className="muted" title="Kendi hesabınız">
                            <ShieldCheck size={15} />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama */}
        {data && data.totalPages > 1 && (
          <div className="pagination">
            <span>{totalLabel}</span>
            <div className="pages">
              <button
                className="btn btn-sm"
                disabled={data.first || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft size={14} /> Önceki
              </button>
              <span style={{ padding: "0 8px" }}>
                {data.page + 1} / {data.totalPages}
              </span>
              <button
                className="btn btn-sm"
                disabled={data.last || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Sonraki <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
