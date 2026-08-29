"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiTeleskorOrders,
  apiTeleskorUpdateOrder,
  ApiError,
} from "@/lib/api-client";
import type { TeleskorMarketOrder, TeleskorOrderStatus } from "@/lib/types";
import { formatDate } from "@/lib/format";

const DURUM_TR: Record<TeleskorOrderStatus, string> = {
  HAZIRLANIYOR: "Hazırlanıyor",
  TESLIM_EDILDI: "Teslim edildi",
  IPTAL: "İptal",
};

/**
 * TELESKOR — market siparişleri.
 *
 * <h3>Bir üyenin geçmişi tek kutudan</h3>
 * Destek sorusu hep aynı: "ben bunu almıştım, ne oldu?" Arama kutusu
 * kullanıcı adı, e-posta ya da kimlikle çalışıyor — destek elindeki
 * bilgiyle arayabilmeli, hangisi olduğunu bilmek zorunda kalmamalı.
 */
export default function TeleskorOrdersClient() {
  const [rows, setRows] = useState<TeleskorMarketOrder[]>([]);
  const [durum, setDurum] = useState<"" | TeleskorOrderStatus>("HAZIRLANIYOR");
  const [kullanici, setKullanici] = useState("");
  const [arama, setArama] = useState("");
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [islemdeki, setIslemdeki] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await apiTeleskorOrders({ durum, kullanici, limit: 200 }));
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Siparişler alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [durum, kullanici]);

  useEffect(() => {
    load();
  }, [load]);

  async function durumDegistir(
    s: TeleskorMarketOrder,
    yeni: TeleskorOrderStatus,
  ) {
    let not: string | null = "";
    if (yeni === "TESLIM_EDILDI") {
      not = prompt(
        "Kullanıcıya gösterilecek not (kargo takip numarası, kupon kodu…):",
        s.yonetici_notu ?? "",
      );
    } else if (yeni === "IPTAL") {
      // İPTAL puanı ve stoğu GERİ VERİYOR — geri alınamaz bir işlem,
      // gerekçe istemek şart.
      not = prompt(
        `"${s.urun_adi}" siparişi iptal edilecek.\n\n` +
          `${s.odenen_puan} TP kullanıcıya İADE EDİLECEK ve stok geri ` +
          `eklenecek.\n\nİptal gerekçesi (kullanıcıya gösterilir):`,
        "",
      );
      if (not === null) return;
    }
    if (not === null) return;

    setIslemdeki(s.id);
    try {
      await apiTeleskorUpdateOrder(s.id, yeni, not || undefined);
      await load();
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Sipariş güncellenemedi.");
    } finally {
      setIslemdeki(null);
    }
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Teleskor — Market Siparişleri</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Telepuanla alınan ürünler. <b>İptal</b>, ödenen puanı kullanıcıya
            iade eder ve stoğu geri ekler — bir kez.
          </div>
        </div>
        <button className="btn" onClick={load}>
          Yenile
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      <div className="card card-pad">
        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}
        >
          {(["HAZIRLANIYOR", "TESLIM_EDILDI", "IPTAL", ""] as const).map((d) => (
            <button
              key={d || "tumu"}
              className={`btn btn-sm ${durum === d ? "btn-primary" : ""}`}
              onClick={() => setDurum(d)}
            >
              {d ? DURUM_TR[d] : "Tümü"}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <input
            className="input"
            style={{ maxWidth: 260 }}
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setKullanici(arama.trim());
            }}
            placeholder="Üye: kullanıcı adı, e-posta ya da id"
          />
          <button
            className="btn btn-sm"
            onClick={() => setKullanici(arama.trim())}
          >
            Ara
          </button>
          {kullanici && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setArama("");
                setKullanici("");
              }}
            >
              Temizle
            </button>
          )}
        </div>

        {loading ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Yükleniyor…
          </div>
        ) : rows.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Kayıt yok.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Üye</th>
                <th>Ürün</th>
                <th>Puan</th>
                <th>Teslimat bilgisi</th>
                <th>Tarih</th>
                <th>Durum</th>
                <th style={{ textAlign: "right" }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.username ?? "—"}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {s.email ?? `#${s.user_id}`}
                    </div>
                  </td>
                  <td>{s.urun_adi}</td>
                  <td>{s.odenen_puan} TP</td>
                  <td style={{ maxWidth: 240 }}>
                    {/* KİŞİSEL VERİ: hesap anonimleştirilince Teleskor
                        tarafında bu alan siliniyor, sipariş satırı kalıyor. */}
                    <div style={{ fontSize: 12.5, whiteSpace: "pre-wrap" }}>
                      {s.teslimat_notu ?? "—"}
                    </div>
                    {s.yonetici_notu && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        ↳ {s.yonetici_notu}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: 12.5 }}>
                    {formatDate(s.created_at)}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        s.durum === "TESLIM_EDILDI"
                          ? "badge-published"
                          : s.durum === "IPTAL"
                            ? "badge-archived"
                            : "badge-scheduled"
                      }`}
                    >
                      {DURUM_TR[s.durum]}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {s.durum !== "TESLIM_EDILDI" && (
                      <button
                        className="btn btn-sm btn-success"
                        disabled={islemdeki === s.id}
                        onClick={() => durumDegistir(s, "TESLIM_EDILDI")}
                      >
                        Teslim
                      </button>
                    )}
                    {s.durum !== "IPTAL" && (
                      <button
                        className="btn btn-sm btn-danger"
                        style={{ marginLeft: 6 }}
                        disabled={islemdeki === s.id}
                        onClick={() => durumDegistir(s, "IPTAL")}
                      >
                        İptal + iade
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
