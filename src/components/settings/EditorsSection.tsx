"use client";

import { useEffect, useState } from "react";
import {
  apiListUsers,
  apiCreateUser,
  apiUpdateUserRole,
  apiUpdateUserEnabled,
  ApiError,
} from "@/lib/api-client";
import type { AdminUserView } from "@/lib/types";

const ROLE_TR: Record<string, string> = {
  ADMIN: "Süper Admin",
  EDITOR: "Editör",
  USER: "Kullanıcı",
};

/**
 * Editör Yönetimi (yalnız ADMIN). Staff (EDITOR/ADMIN) hesaplarını listeler,
 * rol/durum değiştirir ve yeni editör oluşturur. Bir admin kendi rolünü
 * değiştiremez / kendini pasifleştiremez (backend + UI birlikte engeller).
 */
export default function EditorsSection({ currentUserId }: { currentUserId: number }) {
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [rowBusyId, setRowBusyId] = useState<number | null>(null);

  // ---- Yeni editör formu ----
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"EDITOR" | "ADMIN">("EDITOR");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createOk, setCreateOk] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setListError(null);
    try {
      setUsers(await apiListUsers());
    } catch (err) {
      setListError(
        err instanceof ApiError ? err.message : "Kullanıcılar alınamadı.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function changeRole(u: AdminUserView, next: "EDITOR" | "ADMIN") {
    if (next === u.role) return;
    setRowBusyId(u.id);
    setListError(null);
    try {
      const updated = await apiUpdateUserRole(u.id, next);
      setUsers((cur) => cur.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      setListError(
        err instanceof ApiError ? err.message : "Rol değiştirilemedi.",
      );
    } finally {
      setRowBusyId(null);
    }
  }

  async function toggleEnabled(u: AdminUserView) {
    setRowBusyId(u.id);
    setListError(null);
    try {
      const updated = await apiUpdateUserEnabled(u.id, !u.enabled);
      setUsers((cur) => cur.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      setListError(
        err instanceof ApiError ? err.message : "Durum değiştirilemedi.",
      );
    } finally {
      setRowBusyId(null);
    }
  }

  async function createEditor() {
    setCreateError(null);
    setCreateOk(null);
    if (!email.trim() || !displayName.trim() || !password) {
      setCreateError("E-posta, ad ve şifre zorunludur.");
      return;
    }
    if (password.length < 6) {
      setCreateError("Şifre en az 6 karakter olmalı.");
      return;
    }
    setCreating(true);
    try {
      await apiCreateUser({
        email: email.trim(),
        displayName: displayName.trim(),
        password,
        role,
      });
      setCreateOk("Editör oluşturuldu.");
      setEmail("");
      setDisplayName("");
      setPassword("");
      setRole("EDITOR");
      await loadUsers();
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Editör oluşturulamadı.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Editör Yönetimi</div>
          <span className="hint" style={{ margin: 0 }}>
            {users.length} hesap
          </span>
        </div>

        {listError && (
          <div style={{ padding: "14px 22px 0" }}>
            <div className="alert alert-error">{listError}</div>
          </div>
        )}

        {loading ? (
          <div className="state-box">
            <span className="spinner" />
          </div>
        ) : users.length === 0 ? (
          <div className="state-box">
            <div className="big">Kayıt yok</div>
            Henüz editör/yönetici hesabı yok.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>E-posta</th>
                  <th>Ad</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th style={{ textAlign: "right" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const busy = rowBusyId === u.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <span className="cell-title">{u.email}</span>
                        {isSelf && (
                          <span className="cell-sub"> (siz)</span>
                        )}
                      </td>
                      <td>{u.displayName}</td>
                      <td>
                        <select
                          className="select"
                          style={{ width: "auto", minWidth: 140 }}
                          value={u.role}
                          disabled={isSelf || busy}
                          onChange={(e) =>
                            changeRole(u, e.target.value as "EDITOR" | "ADMIN")
                          }
                          title={
                            isSelf ? "Kendi rolünüzü değiştiremezsiniz" : undefined
                          }
                        >
                          <option value="EDITOR">{ROLE_TR.EDITOR}</option>
                          <option value="ADMIN">{ROLE_TR.ADMIN}</option>
                        </select>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            u.enabled ? "badge-published" : "badge-archived"
                          }`}
                        >
                          <span className="badge-dot" />
                          {u.enabled ? "Etkin" : "Pasif"}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className={`btn btn-sm ${u.enabled ? "btn-danger" : ""}`}
                            disabled={isSelf || busy}
                            onClick={() => toggleEnabled(u)}
                            title={
                              isSelf
                                ? "Kendi hesabınızı devre dışı bırakamazsınız"
                                : undefined
                            }
                          >
                            {u.enabled ? "Pasifleştir" : "Etkinleştir"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card card-pad">
        <div className="section-title">Yeni Editör</div>
        <div className="section-hint">
          Yeni bir editör veya yönetici hesabı oluşturun. Kişi bu bilgilerle
          panele giriş yapabilir.
        </div>

        {createError && <div className="alert alert-error">{createError}</div>}
        {createOk && <div className="alert alert-success">{createOk}</div>}

        <div className="grid-2">
          <div className="field">
            <label className="label">
              E-posta <span className="req">*</span>
            </label>
            <input
              className="input"
              type="email"
              value={email}
              autoComplete="off"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="editor@scorestv.com"
            />
          </div>
          <div className="field">
            <label className="label">
              Ad <span className="req">*</span>
            </label>
            <input
              className="input"
              value={displayName}
              maxLength={100}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Adı Soyadı"
            />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label className="label">
              Şifre <span className="req">*</span>
            </label>
            <input
              className="input"
              type="password"
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 6 karakter"
            />
          </div>
          <div className="field">
            <label className="label">Rol</label>
            <select
              className="select"
              value={role}
              onChange={(e) => setRole(e.target.value as "EDITOR" | "ADMIN")}
            >
              <option value="EDITOR">{ROLE_TR.EDITOR}</option>
              <option value="ADMIN">{ROLE_TR.ADMIN}</option>
            </select>
          </div>
        </div>

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button
            className="btn btn-primary"
            onClick={createEditor}
            disabled={creating}
          >
            {creating ? "Oluşturuluyor..." : "Editör Oluştur"}
          </button>
        </div>
      </div>
    </>
  );
}
