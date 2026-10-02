"use client";

import { useCallback, useEffect, useState } from "react";
import { apiTeleskorNotEkle, apiTeleskorNotlar, apiTeleskorNotSil, ApiError } from "@/lib/api-client";
import type { TeleskorUyeNotu } from "@/lib/types";
import Zaman from "@/components/Zaman";

const EN_UZUN = 1000;

/**
 * Üye kartının "İç notlar" bölümü: yalnız panelin gördüğü notlar (kim yazdı,
 * ne zaman). Kullanıcı hiçbir yerde görmez. Silme gerekçeyle, yumuşak:
 * not veritabanında kalır, kimin sildiği bellidir. Hesap anonimleştirilince
 * notlar silinir.
 */
export default function TeleskorIcNotlar({
  userId,
  username,
  onayIste,
}: {
  userId: number;
  username: string;
  onayIste: (baslik: string, uyari: string, onayla: (gerekce: string) => Promise<void>) => void;
}) {
  const [notlar, setNotlar] = useState<TeleskorUyeNotu[] | null>(null);
  const [metin, setMetin] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      setNotlar(await apiTeleskorNotlar(userId));
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Notlar alınamadı.");
    }
  }, [userId]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  async function kaydet() {
    const m = metin.trim();
    if (!m) return;
    setGonderiliyor(true);
    try {
      await apiTeleskorNotEkle(userId, m);
      setMetin("");
      await yukle();
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Not kaydedilemedi.");
    } finally {
      setGonderiliyor(false);
    }
  }

  function sil(n: TeleskorUyeNotu) {
    onayIste(
      "İç notu sil",
      `${username} hakkındaki not listeden kaldırılacak. Not kayıtta durur ve kimin sildiği görünür.`,
      async (gerekce) => {
        await apiTeleskorNotSil(userId, n.id, gerekce);
        await yukle();
      },
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>
        İç notlar
        <span className="muted" style={{ fontWeight: 400, fontSize: 12.5 }}>
          {" "}
          · yalnız yöneticiler görür
        </span>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      <textarea
        className="textarea"
        rows={2}
        maxLength={EN_UZUN}
        value={metin}
        onChange={(e) => setMetin(e.target.value)}
        placeholder="Bu üyeyle ilgili not (ör. destekte iade istedi, sohbette uyarıldı)"
        aria-label="Yeni iç not"
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
        <button
          className="btn btn-sm btn-primary"
          disabled={gonderiliyor || !metin.trim()}
          onClick={kaydet}
        >
          {gonderiliyor ? "Kaydediliyor…" : "Notu kaydet"}
        </button>
        <span className="muted" style={{ fontSize: 12 }}>
          {metin.length}/{EN_UZUN}
        </span>
      </div>

      {notlar && notlar.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {notlar.map((n) => (
            <div
              key={n.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "10px 12px",
                background: "var(--surface)",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1, fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {n.metin}
                </div>
                <button className="btn btn-sm btn-ghost" onClick={() => sil(n)}>
                  Sil
                </button>
              </div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 4, display: "flex", gap: 6 }}>
                <b>{n.yazan ?? "—"}</b>
                <span>·</span>
                <span style={{ display: "inline-flex", gap: 4 }}>
                  <Zaman iso={n.zaman} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
