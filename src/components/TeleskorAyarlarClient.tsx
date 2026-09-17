"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiTeleskorCanliTakip,
  apiTeleskorCanliTakipKaydet,
  ApiError,
} from "@/lib/api-client";
import type { CanliTakipAyari } from "@/lib/types";

function tarih(iso: string | null | undefined): string {
  if (!iso) return "göçten beri (hiç değiştirilmedi)";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("tr-TR");
}

/**
 * Uygulama ayarları — panelden açılıp kapanan ürün anahtarları.
 *
 * <p>Bugün tek anahtar: canlı takip widget'ı. Her değişiklik gerekçe
 * ister; api-1 denetim kaydına yazar.
 */
export default function TeleskorAyarlarClient() {
  const [sunucu, setSunucu] = useState<CanliTakipAyari | null>(null);
  const [acik, setAcik] = useState(true);
  const [gerekce, setGerekce] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const y = await apiTeleskorCanliTakip();
      setSunucu(y);
      setAcik(y.acik);
      setGerekce("");
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Ayar okunamadı.");
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const kirli = sunucu != null && acik !== sunucu.acik;

  const kaydet = async () => {
    if (!kirli || !gerekce.trim()) return;
    setKaydediliyor(true);
    setHata(null);
    setBilgi(null);
    try {
      const y = await apiTeleskorCanliTakipKaydet({ acik, reason: gerekce });
      setSunucu(y);
      setAcik(y.acik);
      setGerekce("");
      setBilgi(
        y.acik
          ? "Canlı takip widget'ı AÇILDI. Maç detayına giren herkes hemen görür."
          : "Canlı takip widget'ı KAPATILDI. Uygulamanın bütün sürümlerinde kart çizilmez.",
      );
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <div className="card-pad">
          <div className="card-title">Canlı takip widget'ı</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Maç detayındaki animasyonlu saha (sağlayıcının canlı takip
            iframe'i). Kapatıldığında api-1 maç detayında bayrağı düşürür;
            uygulamanın <b>mağazadaki sürümleri dahil</b> hiçbiri kartı
            çizmez. Yeni uygulama sürümü gerekmez, etkisi anında.
          </div>

          {hata && <div className="alert alert-error">{hata}</div>}
          {bilgi && <div className="alert alert-success">{bilgi}</div>}

          {yukleniyor ? (
            <div className="muted">Yükleniyor…</div>
          ) : (
            <>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={acik}
                  disabled={kaydediliyor}
                  onChange={(e) => setAcik(e.target.checked)}
                />
                <span>
                  Widget {acik ? "açık" : "kapalı"}
                  {sunucu && acik !== sunucu.acik ? " (kaydedilmedi)" : ""}
                </span>
              </label>
              <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                Sunucudaki durum: <b>{sunucu?.acik ? "AÇIK" : "KAPALI"}</b>
                {" · "}son değişiklik: {tarih(sunucu?.guncellendi)}
                {sunucu?.guncelleyen != null
                  ? ` · yönetici #${sunucu.guncelleyen}`
                  : ""}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-pad">
          <div className="card-title">Kaydet</div>
          <div className="field">
            <label className="label">Gerekçe (zorunlu)</label>
            <input
              className="input"
              maxLength={200}
              placeholder="Örn. Sağlayıcı widget'ı bozuk, geçici kapatma"
              value={gerekce}
              onChange={(e) => setGerekce(e.target.value)}
            />
          </div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Denetim kaydına yazılır. Kaydettiğin an maç detayı değişir —
            uygulamayı ya da sunucuyu yeniden başlatmak gerekmiyor.
          </div>
          <div className="form-actions">
            <button
              className="btn btn-primary"
              disabled={!kirli || !gerekce.trim() || kaydediliyor}
              onClick={kaydet}
            >
              {kaydediliyor ? "Kaydediliyor…" : "Kaydet"}
            </button>
            <button
              className="btn btn-ghost"
              disabled={!kirli || kaydediliyor}
              onClick={() => void yukle()}
            >
              Değişiklikleri geri al
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
