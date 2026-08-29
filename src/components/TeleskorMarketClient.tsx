"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiTeleskorProducts,
  apiTeleskorCreateProduct,
  apiTeleskorUpdateProduct,
  apiTeleskorDeactivateProduct,
  ApiError,
} from "@/lib/api-client";
import type {
  TeleskorMarketProduct,
  TeleskorMarketProductRequest,
} from "@/lib/types";

/**
 * TELESKOR — Telepuan Marketi ürün yönetimi.
 *
 * <p>Fiyat birimi TELEPUAN; para değil. Telepuan satın alınamıyor ve paraya
 * çevrilemiyor — kullanıcı ürünü yalnız oyunlardan kazandığı puanla alıyor.
 */

type Taslak = {
  ad: string;
  aciklama: string;
  gorselUrl: string;
  fiyat: string;
  stok: string;
  kisiBasiLimit: string;
  sira: string;
  teslimatNotuIstiyor: boolean;
  teslimatAciklamasi: string;
  aktif: boolean;
};

const BOS: Taslak = {
  ad: "",
  aciklama: "",
  gorselUrl: "",
  fiyat: "",
  stok: "0",
  kisiBasiLimit: "",
  sira: "0",
  teslimatNotuIstiyor: false,
  teslimatAciklamasi: "",
  aktif: true,
};

function taslaga(u: TeleskorMarketProduct): Taslak {
  return {
    ad: u.ad,
    aciklama: u.aciklama ?? "",
    gorselUrl: u.gorsel_url ?? "",
    fiyat: String(u.fiyat),
    stok: String(u.stok),
    kisiBasiLimit: u.kisi_basi_limit == null ? "" : String(u.kisi_basi_limit),
    sira: String(u.sira),
    teslimatNotuIstiyor: u.teslimat_notu_istiyor,
    teslimatAciklamasi: u.teslimat_aciklamasi ?? "",
    aktif: u.aktif,
  };
}

function istege(t: Taslak): TeleskorMarketProductRequest {
  return {
    ad: t.ad.trim(),
    aciklama: t.aciklama.trim() || null,
    gorselUrl: t.gorselUrl.trim() || null,
    fiyat: Number(t.fiyat),
    stok: Number(t.stok),
    // Boş bırakılan limit "sınırsız" demek — null gidiyor.
    kisiBasiLimit: t.kisiBasiLimit.trim() ? Number(t.kisiBasiLimit) : null,
    sira: Number(t.sira),
    teslimatNotuIstiyor: t.teslimatNotuIstiyor,
    teslimatAciklamasi: t.teslimatAciklamasi.trim() || null,
    aktif: t.aktif,
  };
}

export default function TeleskorMarketClient() {
  const [rows, setRows] = useState<TeleskorMarketProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [duzenlenen, setDuzenlenen] = useState<number | "yeni" | null>(null);
  const [taslak, setTaslak] = useState<Taslak>(BOS);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await apiTeleskorProducts());
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Ürünler alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function yeniAc() {
    setTaslak(BOS);
    setDuzenlenen("yeni");
  }

  function duzenlemeAc(u: TeleskorMarketProduct) {
    setTaslak(taslaga(u));
    setDuzenlenen(u.id);
  }

  async function kaydet() {
    if (!taslak.ad.trim()) {
      setHata("Ürün adı zorunlu.");
      return;
    }
    if (!Number(taslak.fiyat) || Number(taslak.fiyat) < 1) {
      setHata("Fiyat en az 1 Telepuan olmalı.");
      return;
    }
    setKaydediliyor(true);
    setHata(null);
    try {
      if (duzenlenen === "yeni") {
        await apiTeleskorCreateProduct(istege(taslak));
      } else if (typeof duzenlenen === "number") {
        await apiTeleskorUpdateProduct(duzenlenen, istege(taslak));
      }
      setDuzenlenen(null);
      await load();
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally {
      setKaydediliyor(false);
    }
  }

  async function pasiflestir(u: TeleskorMarketProduct) {
    if (
      !confirm(
        `"${u.ad}" vitrinden kaldırılsın mı?\n\n` +
          "Ürün SİLİNMEZ, pasifleşir: verilmiş siparişler ve geçmiş " +
          "olduğu gibi kalır. Geri açmak için ürünü düzenleyip 'Vitrinde " +
          "görünsün' kutusunu işaretle.",
      )
    ) {
      return;
    }
    try {
      await apiTeleskorDeactivateProduct(u.id);
      await load();
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "İşlem başarısız.");
    }
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Teleskor — Telepuan Marketi</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Kullanıcılar oyunlardan kazandıkları <b>Telepuan</b> ile bu
            ürünleri alıyor. Telepuan satın alınamaz ve paraya çevrilemez;
            fiyat alanı para değil, puandır.
          </div>
        </div>
        <button className="btn btn-primary" onClick={yeniAc}>
          Yeni Ürün
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      {duzenlenen !== null && (
        <div className="card card-pad">
          <div className="card-title">
            {duzenlenen === "yeni" ? "Yeni Ürün" : "Ürünü Düzenle"}
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="label">Ürün adı</label>
              <input
                className="input"
                value={taslak.ad}
                maxLength={120}
                onChange={(e) => setTaslak({ ...taslak, ad: e.target.value })}
                placeholder="Teleskor Termos"
              />
            </div>
            <div className="field">
              <label className="label">Fiyat (Telepuan)</label>
              <input
                className="input"
                type="number"
                min={1}
                value={taslak.fiyat}
                onChange={(e) => setTaslak({ ...taslak, fiyat: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label">Stok (adet)</label>
              <input
                className="input"
                type="number"
                min={0}
                value={taslak.stok}
                onChange={(e) => setTaslak({ ...taslak, stok: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label">Kişi başı limit</label>
              <input
                className="input"
                type="number"
                min={1}
                value={taslak.kisiBasiLimit}
                onChange={(e) =>
                  setTaslak({ ...taslak, kisiBasiLimit: e.target.value })
                }
                placeholder="boş = sınırsız"
              />
            </div>
            <div className="field">
              <label className="label">Sıra</label>
              <input
                className="input"
                type="number"
                value={taslak.sira}
                onChange={(e) => setTaslak({ ...taslak, sira: e.target.value })}
                placeholder="küçük olan üstte"
              />
            </div>
            <div className="field">
              <label className="label">Görsel adresi</label>
              <input
                className="input"
                value={taslak.gorselUrl}
                onChange={(e) =>
                  setTaslak({ ...taslak, gorselUrl: e.target.value })
                }
                placeholder="https://cdn.teleskor.com.tr/market/termos.jpg"
              />
            </div>
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label className="label">Açıklama</label>
            <textarea
              className="input"
              rows={2}
              value={taslak.aciklama}
              onChange={(e) =>
                setTaslak({ ...taslak, aciklama: e.target.value })
              }
              placeholder="500 ml paslanmaz çelik termos. Sponsorumuzun katkısıyla."
            />
          </div>

          <label className="check-row" style={{ marginTop: 10 }}>
            <input
              type="checkbox"
              checked={taslak.teslimatNotuIstiyor}
              onChange={(e) =>
                setTaslak({ ...taslak, teslimatNotuIstiyor: e.target.checked })
              }
            />
            Kullanıcıdan teslimat bilgisi iste (beden, adres, telefon…)
          </label>

          {taslak.teslimatNotuIstiyor && (
            <div className="field" style={{ marginTop: 8 }}>
              <label className="label">Kullanıcıya gösterilecek açıklama</label>
              <input
                className="input"
                maxLength={200}
                value={taslak.teslimatAciklamasi}
                onChange={(e) =>
                  setTaslak({ ...taslak, teslimatAciklamasi: e.target.value })
                }
                placeholder="Ad soyad, telefon ve açık adresini yaz"
              />
            </div>
          )}

          <label className="check-row" style={{ marginTop: 10 }}>
            <input
              type="checkbox"
              checked={taslak.aktif}
              onChange={(e) => setTaslak({ ...taslak, aktif: e.target.checked })}
            />
            Vitrinde görünsün
          </label>

          <div className="form-actions">
            <button
              className="btn btn-primary"
              disabled={kaydediliyor}
              onClick={kaydet}
            >
              {kaydediliyor ? "Kaydediliyor…" : "Kaydet"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setDuzenlenen(null)}
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      <div className="card card-pad">
        {loading ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Yükleniyor…
          </div>
        ) : rows.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Henüz ürün yok. Sağ üstteki <b>Yeni Ürün</b> ile başla.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Fiyat</th>
                <th>Stok</th>
                <th>Limit</th>
                <th>Satış</th>
                <th>Durum</th>
                <th style={{ textAlign: "right" }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.ad}</div>
                    {u.aciklama && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {u.aciklama.length > 70
                          ? u.aciklama.slice(0, 70) + "…"
                          : u.aciklama}
                      </div>
                    )}
                  </td>
                  <td>{u.fiyat} TP</td>
                  <td>
                    {u.stok === 0 ? (
                      <span className="badge">tükendi</span>
                    ) : (
                      u.stok
                    )}
                  </td>
                  <td>{u.kisi_basi_limit ?? "—"}</td>
                  <td>{u.satis ?? 0}</td>
                  <td>
                    {u.aktif ? (
                      <span className="badge badge-published">vitrinde</span>
                    ) : (
                      <span className="badge badge-archived">pasif</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-sm"
                      onClick={() => duzenlemeAc(u)}
                    >
                      Düzenle
                    </button>
                    {u.aktif && (
                      <button
                        className="btn btn-sm btn-danger"
                        style={{ marginLeft: 6 }}
                        onClick={() => pasiflestir(u)}
                      >
                        Kaldır
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
