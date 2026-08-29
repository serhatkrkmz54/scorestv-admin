"use client";

import { useCallback, useEffect, useState } from "react";
import { apiDenetimListe, apiDenetimDogrula, ApiError } from "@/lib/api-client";
import type { DenetimSatiri, DenetimZinciri } from "@/lib/types";
import { formatDate } from "@/lib/format";

/**
 * DENETİM KAYDI — "kim, ne zaman, ne yaptı".
 *
 * <h3>Neden bu ekran gerekliydi</h3>
 * Panelden yapılan her yönetici işlemi (rol değişikliği, Telepuan verme,
 * sipariş iptali, üye düzenleme) gerekçesiyle birlikte denetim kaydına
 * yazılıyor — ama okunacak bir yer yoktu. Yazıp okunamaz bırakmak, kaydı
 * hiç tutmamaktan yalnızca biraz iyidir.
 *
 * <h3>Zincir doğrulaması</h3>
 * Her kayıt bir öncekinin SHA-256 özetini taşıyor. "Doğrula" düğmesi
 * zinciri baştan sona kontrol ediyor; {@code intact: false} kayıtların
 * sonradan değiştirildiği anlamına geliyor. Mahkemeye sunulacak bir
 * dökümün yanında bu çıktı da bulunmalı.
 *
 * <h3>Bu sayfanın kendisi de kayda geçiyor</h3>
 * Teleskor, denetim kaydını görüntülemeyi {@code AUDIT_LOG_VIEWED} olarak
 * yazıyor ("denetimin denetimi"). Yani her arama bir satır bırakıyor —
 * listede kendi izlerini görmek beklenen davranış, hata değil.
 */

const OLAY_TR: Record<string, string> = {
  REGISTER: "Kayıt",
  REGISTER_BLOCKED: "Kayıt engellendi",
  LOGIN_SUCCESS: "Giriş",
  LOGIN_FAILED: "Hatalı giriş",
  LOGIN_BLOCKED: "Giriş kilitlendi",
  LOGOUT: "Çıkış",
  TOKEN_REUSE_DETECTED: "Token tekrar kullanımı (hırsızlık şüphesi)",
  PASSWORD_CHANGED: "Şifre değiştirildi",
  PASSWORD_CHANGE_FAILED: "Şifre değişikliği başarısız",
  PASSWORD_RESET_REQUESTED: "Şifre sıfırlama istendi",
  PASSWORD_RESET_BLOCKED: "Şifre sıfırlama engellendi",
  PASSWORD_RESET_COMPLETED: "Şifre sıfırlandı",
  PASSWORD_RESET_FAILED: "Şifre sıfırlama başarısız",
  ACCOUNT_DISABLED: "Hesap kapatıldı",
  ACCOUNT_ENABLED: "Hesap açıldı",
  ACCOUNT_ANONYMIZED: "Hesap anonimleştirildi",
  ROLE_CHANGED: "Rol değiştirildi",
  SESSIONS_REVOKED_BY_ADMIN: "Oturumlar kapatıldı (yönetici)",
  PROFILE_UPDATED_BY_ADMIN: "Profil düzenlendi (yönetici)",
  AVATAR_REMOVED_BY_ADMIN: "Fotoğraf kaldırıldı (yönetici)",
  LOGIN_LOCK_CLEARED_BY_ADMIN: "Kilit açıldı (yönetici)",
  CHAT_MESSAGE_DELETED_BY_ADMIN: "Sohbet mesajı silindi",
  CHAT_REPORT_DISMISSED_BY_ADMIN: "Şikayet yersiz bulundu",
  AUDIT_LOG_VIEWED: "Denetim kaydı görüntülendi",
  CONSENT_ACCEPTED: "Onay verildi",
  CONSENT_WITHDRAWN: "Onay geri çekildi",
  LEGAL_DOCUMENT_PUBLISHED: "Sözleşme sürümü yayınlandı",
  USER_CREATED_BY_ADMIN: "Hesap açıldı (yönetici)",
  TELEPUAN_ADJUSTED_BY_ADMIN: "Telepuan değiştirildi (yönetici)",
  MARKET_PRODUCT_SAVED_BY_ADMIN: "Market ürünü kaydedildi",
  MARKET_ORDER_UPDATED_BY_ADMIN: "Market siparişi güncellendi",
  AUDIT_LOG_PRUNED: "Eski kayıtlar silindi",
};

/** Süzgeç kutusundaki hazır seçenekler — sık bakılanlar önce. */
const SIK_OLAYLAR = [
  "ROLE_CHANGED",
  "TELEPUAN_ADJUSTED_BY_ADMIN",
  "MARKET_ORDER_UPDATED_BY_ADMIN",
  "MARKET_PRODUCT_SAVED_BY_ADMIN",
  "USER_CREATED_BY_ADMIN",
  "PROFILE_UPDATED_BY_ADMIN",
  "ACCOUNT_DISABLED",
  "CHAT_MESSAGE_DELETED_BY_ADMIN",
  "TOKEN_REUSE_DETECTED",
  "LOGIN_BLOCKED",
];

export default function TeleskorDenetimClient() {
  const [satirlar, setSatirlar] = useState<DenetimSatiri[]>([]);
  const [toplam, setToplam] = useState(0);
  const [sayfa, setSayfa] = useState(0);
  const [olay, setOlay] = useState("");
  const [kullaniciId, setKullaniciId] = useState("");
  const [uygulanan, setUygulanan] = useState({ event: "", userId: "" });
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [zincir, setZincir] = useState<DenetimZinciri | null>(null);
  const [dogruluyor, setDogruluyor] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await apiDenetimListe({
        event: uygulanan.event || undefined,
        userId: uygulanan.userId || undefined,
        page: sayfa,
        size: 50,
      });
      setSatirlar(p.content);
      setToplam(p.totalElements);
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Kayıtlar alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [uygulanan, sayfa]);

  useEffect(() => {
    load();
  }, [load]);

  async function dogrula() {
    setDogruluyor(true);
    try {
      setZincir(await apiDenetimDogrula());
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Zincir doğrulanamadı.");
    } finally {
      setDogruluyor(false);
    }
  }

  function uygula() {
    setSayfa(0);
    setUygulanan({ event: olay, userId: kullaniciId.trim() });
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Teleskor — Denetim Kaydı</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Panelden yapılan her yönetici işlemi gerekçesiyle burada.{" "}
            <b>Bu sayfayı açmak da kayda geçiyor</b> — listede kendi izlerini
            görmen beklenen davranış.
          </div>
        </div>
        <button className="btn" disabled={dogruluyor} onClick={dogrula}>
          {dogruluyor ? "Doğrulanıyor…" : "Zinciri doğrula"}
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      {zincir && (
        <div className={`alert ${zincir.intact ? "alert-success" : "alert-error"}`}>
          {zincir.intact ? (
            <>
              <b>Zincir sağlam.</b> {zincir.checkedEntries} kayıt kontrol
              edildi (toplam {zincir.totalEverWritten} yazılmış).{" "}
              {formatDate(zincir.verifiedAt)}
            </>
          ) : (
            <>
              <b>ZİNCİR BOZUK — kayıtlar sonradan değiştirilmiş olabilir.</b>
              <ul style={{ margin: "6px 0 0 18px" }}>
                {zincir.problems.slice(0, 10).map((p, i) => (
                  <li key={i} style={{ fontSize: 12.5 }}>
                    {p}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="card card-pad">
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <select
            className="input"
            style={{ maxWidth: 280 }}
            value={olay}
            onChange={(e) => setOlay(e.target.value)}
          >
            <option value="">Tüm olaylar</option>
            {SIK_OLAYLAR.map((k) => (
              <option key={k} value={k}>
                {OLAY_TR[k] ?? k}
              </option>
            ))}
          </select>
          <input
            className="input"
            style={{ maxWidth: 180 }}
            value={kullaniciId}
            onChange={(e) => setKullaniciId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") uygula();
            }}
            placeholder="Kullanıcı id"
          />
          <button className="btn btn-sm" onClick={uygula}>
            Süz
          </button>
          {(uygulanan.event || uygulanan.userId) && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setOlay("");
                setKullaniciId("");
                setSayfa(0);
                setUygulanan({ event: "", userId: "" });
              }}
            >
              Temizle
            </button>
          )}
          <div style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 12.5 }}>
            {toplam} kayıt
          </span>
        </div>

        {loading ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Yükleniyor…
          </div>
        ) : satirlar.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Kayıt yok.
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 150 }}>Zaman</th>
                  <th>Olay</th>
                  <th style={{ width: 110 }}>Kullanıcı</th>
                  <th style={{ width: 110 }}>Yapan</th>
                  <th>Ayrıntı</th>
                  <th style={{ width: 120 }}>IP</th>
                </tr>
              </thead>
              <tbody>
                {satirlar.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontSize: 12.5 }}>{formatDate(s.occurredAt)}</td>
                    <td style={{ fontSize: 12.5 }}>
                      <div style={{ fontWeight: 600 }}>
                        {OLAY_TR[s.event] ?? s.event}
                      </div>
                      {s.outcome !== "SUCCESS" && (
                        <span className="badge badge-archived">{s.outcome}</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      {s.userId ?? "—"}
                      {s.subject && (
                        <div className="muted" style={{ fontSize: 11.5 }}>
                          {s.subject}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 12.5 }}>{s.actorUserId ?? "—"}</td>
                    <td
                      style={{
                        fontSize: 12.5,
                        maxWidth: 320,
                        wordBreak: "break-word",
                      }}
                    >
                      {s.detail ?? "—"}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {s.ipAddress ?? "—"}
                      {s.country && (
                        <div className="muted" style={{ fontSize: 11.5 }}>
                          {s.country}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
                alignItems: "center",
              }}
            >
              <button
                className="btn btn-sm"
                disabled={sayfa === 0}
                onClick={() => setSayfa((s) => Math.max(0, s - 1))}
              >
                Önceki
              </button>
              <span className="muted" style={{ fontSize: 12.5 }}>
                Sayfa {sayfa + 1}
              </span>
              <button
                className="btn btn-sm"
                disabled={(sayfa + 1) * 50 >= toplam}
                onClick={() => setSayfa((s) => s + 1)}
              >
                Sonraki
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
