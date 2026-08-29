"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiTeleskorOrders,
  apiTeleskorUpdateOrder,
  ApiError,
} from "@/lib/api-client";
import type { TeleskorMarketOrder, TeleskorOrderStatus } from "@/lib/types";
import { formatDate } from "@/lib/format";
import TeleskorOnayModal from "./TeleskorOnayModal";

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

  // Durum değişikliği modalı — eskiden tarayıcının prompt() kutusuydu.
  // İptal, ödenen puanı iade eden geri alınamaz bir işlem; onayı düzgün
  // bir pencerede almak gerekiyor.
  const [durumModal, setDurumModal] = useState<{
    siparis: TeleskorMarketOrder;
    yeni: TeleskorOrderStatus;
  } | null>(null);

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

  async function durumUygula(
    s: TeleskorMarketOrder,
    yeni: TeleskorOrderStatus,
    not_: string,
  ) {
    setIslemdeki(s.id);
    try {
      await apiTeleskorUpdateOrder(s.id, yeni, not_ || undefined);
      await load();
      setHata(null);
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
                        onClick={() => setDurumModal({ siparis: s, yeni: "TESLIM_EDILDI" })}
                      >
                        Teslim
                      </button>
                    )}
                    {s.durum !== "IPTAL" && (
                      <button
                        className="btn btn-sm btn-danger"
                        style={{ marginLeft: 6 }}
                        disabled={islemdeki === s.id}
                        onClick={() => setDurumModal({ siparis: s, yeni: "IPTAL" })}
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

      {durumModal && (
        <TeleskorOnayModal
          baslik={
            durumModal.yeni === "TESLIM_EDILDI"
              ? "Siparişi teslim edildi işaretle"
              : "Siparişi iptal et"
          }
          uyari={
            durumModal.yeni === "TESLIM_EDILDI"
              ? `"${durumModal.siparis.urun_adi}" teslim edildi olarak ` +
                "işaretlenecek. Yazdığın not kullanıcının Siparişlerim " +
                "ekranında görünecek."
              : `"${durumModal.siparis.urun_adi}" iptal edilecek. ` +
                `${durumModal.siparis.odenen_puan} TP kullanıcıya İADE ` +
                "EDİLECEK ve stok geri eklenecek. İade bir kez yapılır."
          }
          alanEtiketi={
            durumModal.yeni === "TESLIM_EDILDI"
              ? "Kullanıcıya gösterilecek not"
              : "İptal gerekçesi — kullanıcı GÖRÜR"
          }
          alanIpucu={
            durumModal.yeni === "TESLIM_EDILDI"
              ? "Kargo takip no ya da kupon kodu"
              : "Sponsor kampanyayı durdurdu"
          }
          // Teslimde not ZORUNLU DEĞİL: kargo numarası olmayan dijital
          // ürünlerde yazacak bir şey olmayabilir. İptalde zorunlu —
          // puanı geri gelen kullanıcı sebebini görmeli.
          zorunlu={durumModal.yeni === "IPTAL"}
          onayMetni={
            durumModal.yeni === "TESLIM_EDILDI" ? "Teslim edildi" : "İptal et ve iade et"
          }
          tehlikeli={durumModal.yeni === "IPTAL"}
          onKapat={() => setDurumModal(null)}
          onOnayla={async (deger) => {
            await durumUygula(durumModal.siparis, durumModal.yeni, deger);
            setDurumModal(null);
          }}
        />
      )}
    </div>
  );
}
