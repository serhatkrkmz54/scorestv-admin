"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Plus, Minus, Coins } from "lucide-react";
import { apiSearchGameUsers, apiGrantCoins, ApiError } from "@/lib/api-client";
import type { AdminUserCoin } from "@/lib/types";

interface RowForm {
  amount: string;
  reason: string;
}

export default function GameCoinsClient() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AdminUserCoin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<number, RowForm>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const search = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRows(await apiSearchGameUsers(term.trim()));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Arama başarısız.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(q), 350);
    return () => clearTimeout(t);
  }, [q, search]);

  function formOf(userId: number): RowForm {
    return forms[userId] ?? { amount: "10", reason: "" };
  }
  function setForm(userId: number, patch: Partial<RowForm>) {
    setForms((f) => ({ ...f, [userId]: { ...formOf(userId), ...patch } }));
  }

  async function grant(row: AdminUserCoin, sign: 1 | -1) {
    const form = formOf(row.userId);
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMsg("Geçerli bir miktar gir.");
      return;
    }
    setBusy(row.userId);
    setMsg(null);
    try {
      const res = await apiGrantCoins(
        row.userId,
        sign * Math.round(amount),
        form.reason.trim() || undefined,
      );
      setRows((rs) =>
        rs.map((r) =>
          r.userId === row.userId
            ? { ...r, coinBalance: res.coinBalance, lifetimeCoins: res.lifetimeCoins }
            : r,
        ),
      );
      setMsg(
        `${row.displayName || row.email}: ${sign > 0 ? "+" : "−"}${Math.round(
          amount,
        )} puan uygulandı (yeni bakiye ${res.coinBalance}).`,
      );
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "İşlem başarısız.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      <div>
        <Link href="/game" className="btn btn-sm" style={{ marginBottom: 8 }}>
          <ArrowLeft size={14} /> Oyun
        </Link>
        <h2 style={{ margin: "6px 0 0", fontSize: 20, display: "flex", gap: 8, alignItems: "center" }}>
          <Coins size={20} /> Scores Puanı Yönetimi
        </h2>
        <div className="muted" style={{ fontSize: 13 }}>
          Üyeyi e-posta veya adla ara, puan ekle veya çıkar.
        </div>
      </div>

      <div className="card card-pad">
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
            placeholder="E-posta veya ad (en az 2 harf)"
          />
        </div>
      </div>

      {msg && <div className="alert alert-info">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading && <div className="muted" style={{ padding: 12 }}>Aranıyor…</div>}
      {!loading && q.trim().length >= 2 && rows.length === 0 && !error && (
        <div className="card card-pad muted">Eşleşen üye yok.</div>
      )}

      {rows.map((row) => {
        const form = formOf(row.userId);
        return (
          <div key={row.userId} className="card card-pad">
            <div className="spread" style={{ alignItems: "center" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{row.displayName || "—"}</div>
                <div className="muted" style={{ fontSize: 12 }}>{row.email}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: "var(--accent, #F59E0B)" }}>
                  ★ {row.coinBalance}
                </div>
                <div className="muted" style={{ fontSize: 11 }}>
                  toplam kazanılan {row.lifetimeCoins} puan
                </div>
              </div>
            </div>
            <div className="form-grid" style={{ marginTop: 12, gridTemplateColumns: "120px 1fr auto" }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Miktar</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={form.amount}
                  onChange={(e) => setForm(row.userId, { amount: e.target.value })}
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Sebep (opsiyonel)</label>
                <input
                  className="input"
                  value={form.reason}
                  onChange={(e) => setForm(row.userId, { reason: e.target.value })}
                  placeholder="ör. Kampanya ödülü"
                />
              </div>
              <div className="field" style={{ margin: 0, display: "flex", alignItems: "flex-end", gap: 8 }}>
                <button
                  className="btn btn-success"
                  disabled={busy === row.userId}
                  onClick={() => grant(row, 1)}
                >
                  <Plus size={15} /> Ekle
                </button>
                <button
                  className="btn btn-danger"
                  disabled={busy === row.userId}
                  onClick={() => grant(row, -1)}
                >
                  <Minus size={15} /> Çıkar
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
