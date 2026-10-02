"use client";

import { useCallback, useEffect, useState } from "react";
import { apiTeleskorOturumKapat, apiTeleskorOturumlar, ApiError } from "@/lib/api-client";
import type { TeleskorBildirimCihazi, TeleskorOturumOzeti } from "@/lib/types";
import { formatDate } from "@/lib/format";
import Zaman from "@/components/Zaman";

/**
 * Üye kartının "Oturumlar ve cihazlar" bölümü.
 *
 * Açık oturumlar (cihaz, sürüm, IP, son kullanım) ve bildirim cihazları
 * (açık olanlar + son 30 günde kapananlar, kapanış sebebiyle). Tek bir
 * oturum gerekçeyle kapatılabilir: o cihaz anında düşer, bildirimleri
 * kesilir, diğer cihazlar açık kalır.
 */

const PLATFORM_TR: Record<string, string> = {
  IOS: "iOS",
  ANDROID: "Android",
  WEB: "Web",
};

/** Bildirim cihazının kapanış sebebi; tanınmayan kod olduğu gibi. */
function kapanisYaz(kod: string | null | undefined): string {
  if (!kod) return "kapalı";
  if (kod.startsWith("KONU_ABONELIGI:")) return "Bildirim sunucusu adresi reddetti";
  const tr: Record<string, string> = {
    LOGOUT: "Çıkış yaptı",
    SESSION_CLOSED: "Kullanıcı oturumu kapattı",
    USER_REQUEST: "Bildirimleri kapattı ya da çıkış yaptı",
    UNREGISTERED: "Adres geçersiz (uygulama silinmiş olabilir)",
    ACCOUNT_CLOSED: "Hesap kapandı",
    ADMIN: "Yönetici kapattı",
    YENI_TOKEN: "Aynı cihaz yeniden kaydoldu",
    "UZLASTIRMA:NOT_FOUND": "Bildirim sunucusunda kaydı yok",
  };
  return tr[kod] ?? kod;
}

function platformYaz(p: string | null | undefined): string {
  return p ? (PLATFORM_TR[p] ?? p) : "—";
}

export default function TeleskorOturumlar({
  userId,
  username,
  onayIste,
  onDegisti,
}: {
  userId: number;
  username: string;
  /** Üst bileşenin gerekçe penceresi. */
  onayIste: (baslik: string, uyari: string, onayla: (gerekce: string) => Promise<void>) => void;
  /** Kapatmadan sonra üye kartındaki sayılar tazelensin. */
  onDegisti: () => void;
}) {
  const [veri, setVeri] = useState<TeleskorOturumOzeti | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      setVeri(await apiTeleskorOturumlar(userId));
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Oturumlar alınamadı.");
    }
  }, [userId]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  function kapat(id: string, cihaz: string) {
    onayIste(
      "Bu oturumu kapat",
      `${username} kullanıcısının "${cihaz}" oturumu kapatılacak: o cihaz anında ` +
        "çıkış yapar ve bildirimleri kesilir. Diğer cihazları açık kalır.",
      async (gerekce) => {
        await apiTeleskorOturumKapat(userId, id, gerekce);
        await yukle();
        onDegisti();
      },
    );
  }

  const acikCihaz = veri?.bildirimCihazlari.filter((c) => !c.kapanis) ?? [];
  const kapaliCihaz = veri?.bildirimCihazlari.filter((c) => c.kapanis) ?? [];

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>
        Oturumlar ve cihazlar
      </div>
      {hata ? (
        <div className="alert alert-error">{hata}</div>
      ) : !veri ? (
        <div className="muted" style={{ fontSize: 13 }}>
          Yükleniyor…
        </div>
      ) : (
        <>
          {veri.oturumlar.length === 0 ? (
            <div className="muted" style={{ fontSize: 13 }}>
              Açık oturum yok.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cihaz</th>
                    <th>IP</th>
                    <th>Açıldı</th>
                    <th>Son kullanım</th>
                    <th style={{ textAlign: "right" }} />
                  </tr>
                </thead>
                <tbody>
                  {veri.oturumlar.map((o) => {
                    const ad = o.cihaz || "Adsız cihaz";
                    return (
                      <tr key={o.id}>
                        <td style={{ fontSize: 12.5 }}>
                          <div style={{ fontWeight: 600 }}>{ad}</div>
                          <div className="muted" style={{ fontSize: 11.5 }}>
                            {platformYaz(o.platform)}
                            {o.surum ? ` · sürüm ${o.surum}` : ""}
                            {" · "}
                            {o.bildirimAcik ? "bildirim açık" : "bildirim yok"}
                          </div>
                        </td>
                        <td style={{ fontSize: 12.5 }}>
                          <div>
                            {o.sonIp ?? "—"}
                            {o.ulke ? ` (${o.ulke})` : ""}
                          </div>
                          {o.ilkIp && o.ilkIp !== o.sonIp && (
                            <div className="muted" style={{ fontSize: 11.5 }}>
                              ilk: {o.ilkIp}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 12.5 }}>
                          <Zaman iso={o.baslangic} />
                        </td>
                        <td style={{ fontSize: 12.5 }}>
                          <Zaman iso={o.sonKullanim} />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button className="btn btn-sm" onClick={() => kapat(o.id, ad)}>
                            Kapat
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="label" style={{ marginTop: 12 }}>
            Bildirim cihazları
          </div>
          {acikCihaz.length === 0 ? (
            <div className="muted" style={{ fontSize: 13 }}>
              Açık bildirim cihazı yok.
            </div>
          ) : (
            <CihazTablosu cihazlar={acikCihaz} />
          )}
          {kapaliCihaz.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary className="muted" style={{ fontSize: 12.5, cursor: "pointer" }}>
                Son 30 günde kapanan bildirim kayıtları ({kapaliCihaz.length})
              </summary>
              <CihazTablosu cihazlar={kapaliCihaz} />
            </details>
          )}
        </>
      )}
    </div>
  );
}

function CihazTablosu({ cihazlar }: { cihazlar: TeleskorBildirimCihazi[] }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Cihaz</th>
            <th>Durum</th>
            <th>Takip ettiği konu</th>
            <th>Son görülme</th>
          </tr>
        </thead>
        <tbody>
          {cihazlar.map((c) => (
            <CihazSatiri key={c.id} c={c} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CihazSatiri({ c }: { c: TeleskorBildirimCihazi }) {
  return (
    <tr>
      <td style={{ fontSize: 12.5 }}>
        <div style={{ fontWeight: 600 }}>{c.cihaz || "Adsız cihaz"}</div>
        <div className="muted" style={{ fontSize: 11.5 }}>
          {platformYaz(c.platform)}
          {c.surum ? ` · sürüm ${c.surum}` : ""}
          {c.dil ? ` · ${c.dil}` : ""}
          {c.saatDilimi ? ` · ${c.saatDilimi}` : ""}
        </div>
      </td>
      <td style={{ fontSize: 12.5 }}>
        {c.kapanis ? (
          <>
            <span className="badge badge-archived">Kapalı</span>
            <div className="muted" style={{ fontSize: 11.5 }}>
              {kapanisYaz(c.kapanisSebebi)} · {formatDate(c.kapanis)}
            </div>
          </>
        ) : (
          <span className="badge badge-published">Açık</span>
        )}
      </td>
      <td style={{ fontSize: 12.5 }}>
        {c.kuruluKonu}
        {c.bekleyenKonu > 0 && (
          <span className="muted" style={{ fontSize: 11.5 }}>
            {" "}
            (+{c.bekleyenKonu} bekliyor)
          </span>
        )}
      </td>
      <td style={{ fontSize: 12.5 }}>
        <Zaman iso={c.sonGorulme} />
      </td>
    </tr>
  );
}
