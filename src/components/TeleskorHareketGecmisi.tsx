"use client";

import { useState } from "react";
import { apiTeleskorHareketler, ApiError } from "@/lib/api-client";
import type { DenetimSatiri } from "@/lib/types";
import { ayrintiYaz, BILINMEYEN_IP, konuYaz, OLAY_TR, sistemSatiri } from "@/lib/denetim";
import Zaman from "@/components/Zaman";

/**
 * Üye kartının "Hareket geçmişi" bölümü: bu hesapla ilgili bütün denetim
 * kayıtları tek zaman çizgisinde — kayıt, giriş denemeleri, şifre ve e-posta
 * değişiklikleri, kendi yaptıkları ve ona yönetici olarak yapılanlar.
 *
 * Kendiliğinden YÜKLENMEZ: açmak denetime "üye kartında hareket geçmişi
 * açıldı" yazar; her üye kartı açılışı bir görüntüleme kaydı bırakmasın.
 * Görüntüleme kayıtları listede gizli (geçmiş kendi izleriyle dolmasın);
 * tamamı Denetim Kaydı sayfasında hesap numarasıyla.
 */

const SAYFA = 20;

function yapanYaz(s: DenetimSatiri) {
  // Bazı olaylar (token tekrar kullanımı) yapan alanına hesabın KENDİSİNİ
  // yazıyor; yönetici etiketi yalnız başka bir hesap işlem yaptıysa.
  if (s.actorUserId != null && s.actorUserId === s.userId) {
    return <span className="muted">Kendisi</span>;
  }
  if (s.actorUserId != null) {
    return (
      <>
        <b>{s.actorName ?? `Hesap #${s.actorUserId}`}</b>
        <div className="muted" style={{ fontSize: 11.5 }}>
          yönetici
        </div>
      </>
    );
  }
  if (sistemSatiri(s) || s.ipAddress === BILINMEYEN_IP) {
    return <span className="badge" style={{ whiteSpace: "nowrap" }}>Sistem</span>;
  }
  return <span className="muted">{s.outcome === "SUCCESS" ? "Kendisi" : "Deneme"}</span>;
}

export default function TeleskorHareketGecmisi({ userId }: { userId: number }) {
  const [satirlar, setSatirlar] = useState<DenetimSatiri[] | null>(null);
  const [sayfa, setSayfa] = useState(0);
  const [devami, setDevami] = useState(false);
  const [toplam, setToplam] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function yukle(p: number) {
    setYukleniyor(true);
    try {
      const r = await apiTeleskorHareketler(userId, p, SAYFA);
      setSatirlar((once) => (p === 0 || !once ? r.content : [...once, ...r.content]));
      setSayfa(p);
      setDevami(r.hasNext);
      setToplam(r.totalElements);
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Hareket geçmişi alınamadı.");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>
        Hareket geçmişi
        {satirlar && (
          <span className="muted" style={{ fontWeight: 400, fontSize: 12.5 }}>
            {" "}
            · {toplam} kayıt
          </span>
        )}
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      {!satirlar ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-sm" disabled={yukleniyor} onClick={() => yukle(0)}>
            {yukleniyor ? "Yükleniyor…" : "Hareket geçmişini göster"}
          </button>
          <span className="muted" style={{ fontSize: 12 }}>
            Kayıt, girişler, şifre/e-posta değişiklikleri ve yönetici işlemleri. Açmak
            denetim kaydına yazılır.
          </span>
        </div>
      ) : satirlar.length === 0 ? (
        <div className="muted" style={{ fontSize: 13 }}>
          Bu hesapla ilgili kayıt yok.
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 130 }}>Zaman</th>
                  <th>Olay</th>
                  <th style={{ width: 110 }}>Yapan</th>
                  <th style={{ width: 120 }}>IP</th>
                  <th>Ayrıntı</th>
                </tr>
              </thead>
              <tbody>
                {satirlar.map((s) => {
                  const konu =
                    s.subject && s.subject !== s.userName ? konuYaz(s.subject) : null;
                  return (
                    <tr key={s.id}>
                      <td style={{ fontSize: 12.5 }}>
                        <Zaman iso={s.occurredAt} />
                      </td>
                      <td style={{ fontSize: 12.5 }}>
                        <div style={{ fontWeight: 600 }}>{OLAY_TR[s.event] ?? s.event}</div>
                        {s.outcome === "FAILURE" && (
                          <span className="badge badge-archived">Başarısız</span>
                        )}
                        {konu && (
                          <div className="muted" style={{ fontSize: 11.5 }}>
                            {konu}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12.5 }}>{yapanYaz(s)}</td>
                      <td style={{ fontSize: 12 }}>
                        {s.ipAddress == null || s.ipAddress === BILINMEYEN_IP ? (
                          <span className="muted">—</span>
                        ) : (
                          s.ipAddress
                        )}
                        {s.country && (
                          <div className="muted" style={{ fontSize: 11.5 }}>
                            {s.country}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12.5, maxWidth: 320, wordBreak: "break-word" }}>
                        {ayrintiYaz(s.detail)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            {devami && (
              <button className="btn btn-sm" disabled={yukleniyor} onClick={() => yukle(sayfa + 1)}>
                {yukleniyor ? "Yükleniyor…" : "Daha eski kayıtlar"}
              </button>
            )}
            <span className="muted" style={{ fontSize: 12 }}>
              Görüntüleme kayıtları burada gösterilmez; tamamı Denetim Kaydı sayfasında.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
