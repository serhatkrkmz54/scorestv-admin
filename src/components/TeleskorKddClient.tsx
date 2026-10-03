"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ApiError,
  apiTeleskorKddHavuz,
  apiTeleskorKddTazele,
  apiTeleskorKddHaricler,
  apiTeleskorKddHaricEkle,
  apiTeleskorKddHaricSil,
  apiTeleskorKddIstatistik,
  type KddHavuz,
  type KddHaric,
  type KddIstatistik,
} from "@/lib/api-client";

const MOD_ADI: Record<string, string> = { SERI: "Seri", GUNLUK: "Günün Düellosu", DUELLO: "Arkadaş düellosu" };

function para(deger: number, birim?: string | null): string {
  const b = birim ? ` ${birim}` : "";
  if (deger >= 1_000_000) return `${(deger / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}M${b}`;
  if (deger >= 1000) return `${Math.round(deger / 1000)}B${b}`;
  return `${deger}${b}`;
}

function hata(e: unknown, yedek: string): string {
  return e instanceof ApiError ? e.message : yedek;
}

/**
 * Teleskor → Kim Daha Değerli? (api-1 V75).
 *
 * <ul>
 *   <li><b>İstatistik</b>: günün oynanma sayıları (biçim, üye/misafir),
 *       Günün Düellosu'nun soru soru doğru oranı.</li>
 *   <li><b>Havuz</b>: oyuncu ara; değeri yanlış görünen oyuncuyu havuz
 *       dışına al (yeni sorularda çıkmaz; verilmiş setler değişmez).</li>
 * </ul>
 * Süre ve ödüller Uygulama Ayarları'nın "Kim Daha Değerli?" grubunda.
 */
export default function TeleskorKddClient() {
  const [sekme, setSekme] = useState<"istatistik" | "havuz">("istatistik");
  return (
    <div className="stack">
      <div className="card">
        <div className="card-header">
          <div className="card-title">Kim Daha Değerli?</div>
        </div>
        <div className="card-pad">
          <div className="hint" style={{ marginBottom: 10 }}>
            İki futbolcudan piyasa değeri yüksek olanı seçme oyunu. Soru süresi, Tele Puan ödülleri, havuz büyüklüğü ve
            oyunu kapatma <Link href="/teleskor/ayarlar">Uygulama Ayarları</Link>{" "}sayfasının &quot;Kim Daha Değerli?&quot;
            grubunda.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className={`btn btn-sm ${sekme === "istatistik" ? "btn-primary" : ""}`} onClick={() => setSekme("istatistik")}>
              İstatistik
            </button>
            <button className={`btn btn-sm ${sekme === "havuz" ? "btn-primary" : ""}`} onClick={() => setSekme("havuz")}>
              Oyuncu havuzu
            </button>
          </div>
        </div>
      </div>
      {sekme === "istatistik" ? <IstatistikKarti /> : <HavuzKarti />}
    </div>
  );
}

function IstatistikKarti() {
  const [gun, setGun] = useState("");
  const [veri, setVeri] = useState<KddIstatistik | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    apiTeleskorKddIstatistik(gun)
      .then((v) => { if (!iptal) { setVeri(v); setMesaj(null); } })
      .catch((e) => { if (!iptal) setMesaj(hata(e, "İstatistik alınamadı.")); });
    return () => { iptal = true; };
  }, [gun]);

  const g = veri?.gununDuellosu;
  return (
    <div className="card">
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div className="card-title">Günlük istatistik</div>
        <input className="input" type="date" value={gun} onChange={(e) => setGun(e.target.value)} style={{ maxWidth: 170 }} aria-label="Gün" />
      </div>
      <div className="card-pad">
        {mesaj && <div className="alert alert-error">{mesaj}</div>}
        {veri && (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Biçim</th>
                    <th>Başlayan</th>
                    <th>Biten</th>
                    <th>Misafir</th>
                    <th>Üye</th>
                    <th>Ort. doğru</th>
                    <th>En iyi</th>
                  </tr>
                </thead>
                <tbody>
                  {veri.bicimler.length === 0 && (
                    <tr><td colSpan={7} className="muted">Bu gün oyun oynanmadı.</td></tr>
                  )}
                  {veri.bicimler.map((b) => (
                    <tr key={b.mod}>
                      <td>{MOD_ADI[b.mod] ?? b.mod}</td>
                      <td>{b.baslayan}</td>
                      <td>{b.biten}</td>
                      <td>{b.misafir}</td>
                      <td>{b.uye}</td>
                      <td>{b.ortalamaDogru == null ? "-" : b.ortalamaDogru.toLocaleString("tr-TR")}</td>
                      <td>{b.enIyi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="hint" style={{ marginTop: 8 }}>Açılan arkadaş düellosu: {veri.duelloAcilan}</div>
            <div className="card-title" style={{ marginTop: 18, fontSize: 15 }}>
              Günün Düellosu {g ? `(bitiren ${g.bitiren})` : ""}
            </div>
            {!g ? (
              <div className="hint">Bu günün düellosu henüz açılmadı (günün ilk oyuncusu açar).</div>
            ) : (
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Sol</th>
                      <th>Sağ</th>
                      <th>Doğru oranı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.sorular.map((s) => (
                      <tr key={s.no}>
                        <td>{s.no}</td>
                        <td style={{ fontWeight: s.dogruTaraf === "SOL" ? 700 : 400 }}>
                          {s.sol.ad}
                          <div className="cell-sub">{s.sol.takim ?? "-"} · {para(s.sol.deger, s.sol.birim)}</div>
                        </td>
                        <td style={{ fontWeight: s.dogruTaraf === "SAG" ? 700 : 400 }}>
                          {s.sag.ad}
                          <div className="cell-sub">{s.sag.takim ?? "-"} · {para(s.sag.deger, s.sag.birim)}</div>
                        </td>
                        <td>
                          {s.dogruOrani == null ? "-" : `%${s.dogruOrani.toLocaleString("tr-TR")}`}
                          <div className="cell-sub">{s.cevaplayan} kişi</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function HavuzKarti() {
  const [q, setQ] = useState("");
  const [sadeceHaric, setSadeceHaric] = useState(false);
  const [havuz, setHavuz] = useState<KddHavuz | null>(null);
  const [haricler, setHaricler] = useState<KddHaric[]>([]);
  const [mesaj, setMesaj] = useState<{ tur: "ok" | "err"; metin: string } | null>(null);
  const [mesgul, setMesgul] = useState(false);

  const yukle = useCallback(async (aranan: string, haric: boolean) => {
    try {
      const [h, l] = await Promise.all([apiTeleskorKddHavuz(aranan, haric), apiTeleskorKddHaricler()]);
      setHavuz(h);
      setHaricler(l);
    } catch (e) {
      setMesaj({ tur: "err", metin: hata(e, "Havuz alınamadı.") });
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void yukle(q, sadeceHaric), 300);
    return () => clearTimeout(t);
  }, [q, sadeceHaric, yukle]);

  async function cikar(id: number, ad: string) {
    const notu = window.prompt(`${ad} havuz dışına alınsın. Not (isteğe bağlı):`, "");
    if (notu === null) return;
    setMesgul(true);
    try {
      await apiTeleskorKddHaricEkle(id, notu);
      setMesaj({ tur: "ok", metin: `${ad} havuz dışına alındı; en geç bir dakikada yeni sorularda çıkmaz.` });
      await yukle(q, sadeceHaric);
    } catch (e) {
      setMesaj({ tur: "err", metin: hata(e, "Havuz dışına alınamadı.") });
    } finally {
      setMesgul(false);
    }
  }

  async function geriKoy(id: number, ad: string | null) {
    setMesgul(true);
    try {
      await apiTeleskorKddHaricSil(id);
      setMesaj({ tur: "ok", metin: `${ad ?? "Oyuncu"} havuza geri kondu.` });
      await yukle(q, sadeceHaric);
    } catch (e) {
      setMesaj({ tur: "err", metin: hata(e, "Havuza geri konamadı.") });
    } finally {
      setMesgul(false);
    }
  }

  async function tazele() {
    setMesgul(true);
    try {
      const r = await apiTeleskorKddTazele();
      setMesaj({ tur: "ok", metin: `Havuz yeniden yüklendi: ${r.toplam} oyuncu.` });
      await yukle(q, sadeceHaric);
    } catch (e) {
      setMesaj({ tur: "err", metin: hata(e, "Havuz tazelenemedi.") });
    } finally {
      setMesgul(false);
    }
  }

  return (
    <div className="stack">
      {mesaj && <div className={`alert ${mesaj.tur === "ok" ? "alert-success" : "alert-error"}`}>{mesaj.metin}</div>}
      <div className="card">
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div className="card-title">
            Oyuncu havuzu {havuz ? `(${havuz.toplam} oyuncu, ${havuz.haricSayisi} dışarıda)` : ""}
          </div>
          <button className="btn btn-sm" disabled={mesgul} onClick={() => void tazele()}>Havuzu tazele</button>
        </div>
        <div className="card-pad">
          <div className="hint" style={{ marginBottom: 10 }}>
            Havuz: dünyanın en değerli oyuncuları ve öne çıkan liglerin kulüplerindeki oyuncular; fotoğrafı, kulübü ve son 12
            ayda değer kaydı olanlar girer. Değeri yanlış görünen oyuncuyu havuz dışına alın: yeni sorularda çıkmaz, daha
            önce verilmiş Günün Düellosu ve düello soruları değişmez.
            {havuz?.olusturuldu ? ` Son yükleme: ${new Date(havuz.olusturuldu).toLocaleString("tr-TR")}.` : ""}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
            <input className="input" placeholder="Oyuncu, takım ya da lig ara" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320 }} />
            <label className="check-row" style={{ fontSize: 13 }}>
              <input type="checkbox" checked={sadeceHaric} onChange={(e) => setSadeceHaric(e.target.checked)} />
              <span>Yalnız dışarıdakiler</span>
            </label>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Oyuncu</th>
                  <th>Değer</th>
                  <th>Değer tarihi</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {havuz && havuz.oyuncular.length === 0 && (
                  <tr><td colSpan={4} className="muted">Kayıt yok.</td></tr>
                )}
                {havuz?.oyuncular.map((o) => (
                  <tr key={o.id}>
                    <td>
                      {o.ad}
                      <div className="cell-sub">{[o.takim, o.lig].filter(Boolean).join(" · ") || "-"}</div>
                    </td>
                    <td>{para(o.deger, o.birim)}</td>
                    <td>{o.degerTarihi ? new Date(o.degerTarihi).toLocaleDateString("tr-TR") : "-"}</td>
                    <td style={{ textAlign: "right" }}>
                      {o.haric ? (
                        <button className="btn btn-sm" disabled={mesgul} onClick={() => void geriKoy(o.id, o.ad)}>Havuza geri koy</button>
                      ) : (
                        <button className="btn btn-sm btn-danger" disabled={mesgul} onClick={() => void cikar(o.id, o.ad)}>Havuz dışına al</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Havuz dışındakiler ({haricler.length})</div>
        </div>
        <div className="card-pad">
          {haricler.length === 0 ? (
            <div className="hint">Havuz dışına alınmış oyuncu yok.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Oyuncu</th>
                    <th>Not</th>
                    <th>Kim / ne zaman</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {haricler.map((h) => (
                    <tr key={h.playerId}>
                      <td>{h.ad ?? `#${h.playerId}`}</td>
                      <td>{h.notu ?? "-"}</td>
                      <td>
                        {h.ekleyen ?? "-"}
                        <div className="cell-sub">{new Date(h.eklendi).toLocaleString("tr-TR")}</div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn btn-sm" disabled={mesgul} onClick={() => void geriKoy(h.playerId, h.ad)}>Havuza geri koy</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
