"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiTeleskorUygulamaAyarlari,
  apiTeleskorUygulamaAyariKaydet,
  apiTeleskorUygulamaAyariVarsayilan,
  ApiError,
} from "@/lib/api-client";
import type { UygulamaAyari } from "@/lib/types";
import TeleskorOnayModal from "./TeleskorOnayModal";

function tarih(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("tr-TR");
}

/**
 * Uygulama ayarları — api-1 kataloğu, grup grup (V67).
 *
 * <p>Her satır kendi başına kaydedilir (tek anahtar = tek denetim kaydı).
 * Gerekçe "Kaydet" / "Varsayılana dön"e basınca açılan pencerede istenir
 * (29 Eylül; eskiden sayfanın en altında tek kutuydu ve uzun sayfada
 * görünmüyordu). Pencere aynı oturumda son yazılan gerekçeyle açılır:
 * birkaç satırı aynı sebeple değiştiren yönetici tekrar yazmasın.
 * "Varsayılana dön" satırı siler: .env değeri geri gelir.
 */
export default function TeleskorAyarlarClient() {
  const [liste, setListe] = useState<UygulamaAyari[]>([]);
  const [taslak, setTaslak] = useState<Record<string, string>>({});
  const [sonGerekce, setSonGerekce] = useState("");
  const [onay, setOnay] = useState<{ ayar: UygulamaAyari; islem: "KAYDET" | "VARSAYILAN" } | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const y = await apiTeleskorUygulamaAyarlari();
      setListe(y);
      const t: Record<string, string> = {};
      for (const a of y) t[a.anahtar] = a.deger;
      setTaslak(t);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Ayarlar okunamadı.");
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const gruplar = useMemo(() => {
    const m = new Map<string, UygulamaAyari[]>();
    for (const a of liste) {
      const g = m.get(a.grup) ?? [];
      g.push(a);
      m.set(a.grup, g);
    }
    return [...m.entries()];
  }, [liste]);

  const guncelle = (yeni: UygulamaAyari) => {
    setListe((l) => l.map((a) => (a.anahtar === yeni.anahtar ? yeni : a)));
    setTaslak((t) => ({ ...t, [yeni.anahtar]: yeni.deger }));
  };

  /**
   * Penceredeki "Onayla": hata FIRLATILIR ki pencere açık kalsın ve mesajı
   * kendi içinde göstersin (yazılan gerekçe kaybolmasın).
   */
  const uygula = async (a: UygulamaAyari, islem: "KAYDET" | "VARSAYILAN", gerekce: string) => {
    setMesgul(a.anahtar);
    setHata(null);
    setBilgi(null);
    try {
      const y =
        islem === "KAYDET"
          ? await apiTeleskorUygulamaAyariKaydet(a.anahtar, {
              deger: taslak[a.anahtar] ?? a.deger,
              reason: gerekce,
            })
          : await apiTeleskorUygulamaAyariVarsayilan(a.anahtar, gerekce);
      guncelle(y);
      setSonGerekce(gerekce);
      setOnay(null);
      setBilgi(
        islem === "KAYDET"
          ? `${a.etiket}: kaydedildi (${goster(y)}). Etkisi anında.`
          : `${a.etiket}: varsayılana döndü (${goster(y)}).`,
      );
    } finally {
      setMesgul(null);
    }
  };

  const degisimMetni = (a: UygulamaAyari, islem: "KAYDET" | "VARSAYILAN"): string => {
    const yeni =
      islem === "KAYDET" ? taslak[a.anahtar] ?? a.deger : a.varsayilan;
    const gorunur = (d: string) =>
      a.tur === "BOOL" ? (d === "true" ? "Açık" : "Kapalı") : d || "(boş)";
    return `${a.etiket}: ${gorunur(a.deger)} → ${gorunur(yeni)}. Kaydedildiği an bütün uygulama sürümlerinde geçerli olur. Denetim kaydına anahtar, yeni değer ve gerekçe yazılır.`;
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <div className="card-pad">
          <div className="card-title">Uygulama ayarları</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Buradaki her anahtar <b>kaydedildiği an</b> ve <b>mağazadaki bütün
            sürümlerde</b> geçerli olur; uygulama ya da sunucu yeniden
            başlatılmaz. "Varsayılan" sütunu api-1'in .env değeridir;
            "Varsayılana dön" panel satırını siler ve o değer geri gelir.
            Yalnız <b>Uygulama</b> grubundaki zorunlu sürüm, bakım, şerit ve
            sekme anahtarları uygulamanın 1.0.76 ve sonrasında okunur.
          </div>
        </div>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}
      {bilgi && <div className="alert alert-success">{bilgi}</div>}

      {yukleniyor ? (
        <div className="card card-pad muted">Yükleniyor…</div>
      ) : (
        gruplar.map(([grup, satirlar]) => (
          <div className="card" key={grup}>
            <div className="card-pad">
              <div className="card-title">{grup}</div>
              <div style={{ display: "grid", gap: 14 }}>
                {satirlar.map((a) => {
                  const deger = taslak[a.anahtar] ?? a.deger;
                  const kirli = deger !== a.deger;
                  const mesgulMu = mesgul === a.anahtar;
                  return (
                    <div
                      key={a.anahtar}
                      className="mobil-tek-sutun"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(220px, 1.2fr) minmax(200px, 1fr) auto",
                        gap: 12,
                        alignItems: "start",
                        paddingBottom: 12,
                        borderBottom: "1px solid var(--border, #e5e7eb)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {a.etiket}
                          {a.kaynak === "PANEL" ? (
                            <span className="badge badge-scheduled" style={{ marginLeft: 8 }}>
                              panelden
                            </span>
                          ) : (
                            <span className="badge" style={{ marginLeft: 8 }}>
                              varsayılan
                            </span>
                          )}
                        </div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                          {a.aciklama}
                        </div>
                        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                          <code>{a.anahtar}</code> · varsayılan: <b>{a.varsayilan || "(boş)"}</b>
                          {a.guncellendi ? ` · son: ${tarih(a.guncellendi)}` : ""}
                          {a.guncelleyen != null ? ` · yönetici #${a.guncelleyen}` : ""}
                        </div>
                      </div>
                      <div>
                        {a.tur === "BOOL" ? (
                          <label
                            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                          >
                            <input
                              type="checkbox"
                              checked={deger === "true"}
                              disabled={mesgulMu}
                              onChange={(e) =>
                                setTaslak((t) => ({
                                  ...t,
                                  [a.anahtar]: e.target.checked ? "true" : "false",
                                }))
                              }
                            />
                            <span>{deger === "true" ? "Açık" : "Kapalı"}</span>
                          </label>
                        ) : a.tur === "INT" ? (
                          <input
                            className="input"
                            type="number"
                            min={a.enAz ?? undefined}
                            max={a.enCok ?? undefined}
                            value={deger}
                            disabled={mesgulMu}
                            onChange={(e) =>
                              setTaslak((t) => ({ ...t, [a.anahtar]: e.target.value }))
                            }
                          />
                        ) : (
                          <input
                            className="input"
                            maxLength={500}
                            value={deger}
                            disabled={mesgulMu}
                            onChange={(e) =>
                              setTaslak((t) => ({ ...t, [a.anahtar]: e.target.value }))
                            }
                          />
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={!kirli || mesgulMu}
                          onClick={() => setOnay({ ayar: a, islem: "KAYDET" })}
                        >
                          {mesgulMu ? "…" : "Kaydet"}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={a.kaynak !== "PANEL" || mesgulMu}
                          title="Panel satırını siler; .env değeri geri gelir"
                          onClick={() => setOnay({ ayar: a, islem: "VARSAYILAN" })}
                        >
                          Varsayılana dön
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))
      )}

      {onay && (
        <TeleskorOnayModal
          baslik={onay.islem === "KAYDET" ? "Ayarı kaydet" : "Varsayılana dön"}
          uyari={degisimMetni(onay.ayar, onay.islem)}
          alanEtiketi="Gerekçe (zorunlu)"
          alanIpucu="Örn. Sağlayıcı widget'ı bozuk, geçici kapatma"
          baslangicDegeri={sonGerekce}
          azamiUzunluk={200}
          onayMetni={onay.islem === "KAYDET" ? "Kaydet" : "Varsayılana dön"}
          onKapat={() => setOnay(null)}
          onOnayla={(gerekce) => uygula(onay.ayar, onay.islem, gerekce)}
        />
      )}
    </div>
  );
}

function goster(a: UygulamaAyari): string {
  if (a.tur === "BOOL") return a.deger === "true" ? "açık" : "kapalı";
  return a.deger || "(boş)";
}
