"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiTeleskorOzetDurumlari,
  apiTeleskorOzetKaydet,
  apiTeleskorOzetMaclari,
  apiTeleskorOzetSil,
} from "@/lib/api-client";
import type { TeleskorMacOzeti } from "@/lib/types";

/**
 * MAÇ ÖZETİ — maç sonrası video ekleme ekranı (Teleskor V55).
 *
 * <h3>Ekran gün gün çalışıyor</h3>
 * "Özet eklenecek maç" sorusunun doğal ekseni tarih: yönetici dün akşam
 * oynanan maçlara video ekliyor. Arama kutusu olsaydı maç adını doğru
 * yazmak gerekirdi ve aynı isimli takımlar (alt lig, kadın takımı,
 * U19) ayırt edilemezdi.
 *
 * <h3>Varsayılan tarih DÜN</h3>
 * Özet ancak maç bittikten sonra yayınlanıyor; bugünün maçlarının çoğu
 * ekranın açıldığı anda ya oynanmamış ya da sürüyor olacak. Bugün
 * açılsaydı yönetici her seferinde bir gün geri gitmek zorunda kalırdı.
 */

/** Motorun {@code MatchView} yanıtından yalnız burada kullanılan alanlar. */
type Mac = {
  id: number;
  status?: string | null;
  kickoffAt?: string | null;
  homeScoreDisplay?: number | null;
  awayScoreDisplay?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  competition?: { name?: string | null } | null;
  homeTeam?: { name?: string | null } | null;
  awayTeam?: { name?: string | null } | null;
};

function dunTarihi(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function saat(iso?: string | null): string {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    // SAAT DİLİMİ SABİT: tarayıcıdan alınsaydı yurt dışından bakan bir
    // yönetici başka bir saat görürdü ve "maç kaçta oynandı" sorusu iki
    // kişide iki farklı cevap verirdi. Projede bir kez ödenen ders.
    timeZone: "Europe/Istanbul",
  });
}

function skor(m: Mac): string {
  const e = m.homeScoreDisplay ?? m.homeScore;
  const d = m.awayScoreDisplay ?? m.awayScore;
  return e == null || d == null ? "-" : `${e} - ${d}`;
}

export default function TeleskorMacOzetiClient() {
  const [tarih, setTarih] = useState(dunTarihi);
  const [spor, setSpor] = useState("FOOTBALL");
  const [maclar, setMaclar] = useState<Mac[]>([]);
  const [ozetler, setOzetler] = useState<Record<string, TeleskorMacOzeti>>({});
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  /** Düzenlenen maç — aynı anda tek satır açık. */
  const [acikMac, setAcikMac] = useState<number | null>(null);
  const [adres, setAdres] = useState("");
  const [baslik, setBaslik] = useState("");
  const [yayinda, setYayinda] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const ham = (await apiTeleskorOzetMaclari(tarih, spor)) as Mac[];
      const liste = Array.isArray(ham) ? ham : [];
      setMaclar(liste);
      // ÖZET DURUMLARI TEK İSTEKTE: maç başına sorulsaydı 600 maçlık bir
      // cumartesi 600 istek ederdi.
      setOzetler(await apiTeleskorOzetDurumlari(liste.map((m) => m.id)));
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Maçlar alınamadı.");
      setMaclar([]);
      setOzetler({});
    } finally {
      setYukleniyor(false);
    }
  }, [tarih, spor]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  /**
   * BİTMİŞ MAÇLAR ÜSTTE.
   *
   * <p>Özet yalnız bitmiş maça eklenebiliyor (uygulama sekmeyi yalnız
   * orada çiziyor); listenin başında oynanmamış maçlar dursaydı yönetici
   * her seferinde aşağı kaydırırdı.
   */
  const sirali = useMemo(() => {
    const bittiMi = (m: Mac) => m.status === "FINISHED";
    return [...maclar].sort((a, b) => {
      if (bittiMi(a) !== bittiMi(b)) return bittiMi(a) ? -1 : 1;
      return (a.kickoffAt ?? "").localeCompare(b.kickoffAt ?? "");
    });
  }, [maclar]);

  function ac(m: Mac) {
    const mevcut = ozetler[String(m.id)];
    setAcikMac(m.id);
    setAdres(mevcut?.embedUrl ?? "");
    setBaslik(mevcut?.baslik ?? "");
    setYayinda(mevcut?.yayinda ?? true);
    setHata(null);
    setBilgi(null);
  }

  async function kaydet(macId: number) {
    setKaydediliyor(true);
    setHata(null);
    setBilgi(null);
    try {
      const kayit = await apiTeleskorOzetKaydet(
        macId,
        adres,
        baslik.trim() || null,
        yayinda,
      );
      setOzetler((o) => ({ ...o, [String(macId)]: kayit }));
      setAcikMac(null);
      setBilgi("Özet kaydedildi.");
    } catch (e) {
      // HATA MESAJI SUNUCUDAN: adresin neden kabul edilmediğini (izinsiz
      // alan adı, http, kanal adresi) orada biliyoruz. Panelde ikinci bir
      // kural yazılsaydı ikisi zamanla ayrışırdı.
      setHata(e instanceof Error ? e.message : "Özet kaydedilemedi.");
    } finally {
      setKaydediliyor(false);
    }
  }

  async function sil(macId: number) {
    if (!confirm("Bu maçın özet videosu silinsin mi?")) return;
    setKaydediliyor(true);
    setHata(null);
    try {
      await apiTeleskorOzetSil(macId);
      setOzetler((o) => {
        const y = { ...o };
        delete y[String(macId)];
        return y;
      });
      setAcikMac(null);
      setBilgi("Özet silindi.");
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Özet silinemedi.");
    } finally {
      setKaydediliyor(false);
    }
  }

  return (
    <div className="card card-pad" style={{ display: "grid", gap: 14 }}>
      <div>
        <h2 style={{ margin: 0 }}>Maç Özeti</h2>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Maç bitince özet videosunu buradan ekle. Uygulamada o maçın
          detayında <b>Özet</b> sekmesi olarak çıkar. YouTube bağlantısını
          ya da &quot;Paylaş → Yerleştir&quot; kutusundaki kodu
          yapıştırabilirsin — ikisi de kabul ediliyor.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Tarih</span>
          <input
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Spor</span>
          <select value={spor} onChange={(e) => setSpor(e.target.value)}>
            <option value="FOOTBALL">Futbol</option>
            <option value="BASKETBALL">Basketbol</option>
          </select>
        </label>
        <button className="btn" onClick={() => void yukle()} disabled={yukleniyor}>
          {yukleniyor ? "Yükleniyor…" : "Yenile"}
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}
      {bilgi && <div className="alert">{bilgi}</div>}

      {!yukleniyor && sirali.length === 0 && (
        <div className="muted">Bu tarihte maç bulunamadı.</div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {sirali.map((m) => {
          const ozet = ozetler[String(m.id)];
          const bitti = m.status === "FINISHED";
          const acik = acikMac === m.id;
          return (
            <div
              key={m.id}
              className="card"
              style={{ padding: 10, display: "grid", gap: 8 }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span className="muted" style={{ fontSize: 12, minWidth: 46 }}>
                  {saat(m.kickoffAt)}
                </span>
                <span style={{ flex: 1, minWidth: 220 }}>
                  <b>{m.homeTeam?.name ?? "?"}</b> {skor(m)}{" "}
                  <b>{m.awayTeam?.name ?? "?"}</b>
                  <br />
                  <span className="muted" style={{ fontSize: 12 }}>
                    {m.competition?.name ?? "—"} · #{m.id}
                  </span>
                </span>

                {/* MAÇ BİTMEDİYSE UYARI, ama düğme KAPALI DEĞİL: sağlayıcı
                    durumu geç güncelleyebiliyor ve yöneticinin elindeki
                    video geçerli olabilir. Engellemek yerine söylüyoruz. */}
                {!bitti && (
                  <span className="muted" style={{ fontSize: 12 }}>
                    maç bitmedi
                  </span>
                )}
                {ozet && (
                  <span
                    className="badge"
                    title={ozet.embedUrl}
                    style={{ fontSize: 12 }}
                  >
                    {ozet.yayinda ? "✓ özet var" : "○ yayında değil"}
                  </span>
                )}
                <button className="btn" onClick={() => (acik ? setAcikMac(null) : ac(m))}>
                  {acik ? "Kapat" : ozet ? "Düzenle" : "Özet ekle"}
                </button>
              </div>

              {acik && (
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span className="muted" style={{ fontSize: 12 }}>
                      Video bağlantısı veya iframe kodu
                    </span>
                    <textarea
                      rows={3}
                      value={adres}
                      placeholder="https://www.youtube.com/watch?v=..."
                      onChange={(e) => setAdres(e.target.value)}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span className="muted" style={{ fontSize: 12 }}>
                      Başlık (isteğe bağlı — boşsa &quot;Maç özeti&quot;)
                    </span>
                    <input
                      value={baslik}
                      maxLength={160}
                      placeholder={`${m.homeTeam?.name ?? ""} ${skor(m)} ${m.awayTeam?.name ?? ""} | Özet`}
                      onChange={(e) => setBaslik(e.target.value)}
                    />
                  </label>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={yayinda}
                      onChange={(e) => setYayinda(e.target.checked)}
                    />
                    <span>
                      Yayında (kapatırsan uygulamada sekme çıkmaz, kayıt durur)
                    </span>
                  </label>

                  {/* ÖNİZLEME KAYITTAN SONRA: gömme adresini sunucu
                      üretiyor, panel kendi kurmuyor. Kaydetmeden önce
                      önizleme göstermek, panelde ikinci bir çeviri kuralı
                      yazmak demekti. */}
                  {ozet && (
                    <div style={{ display: "grid", gap: 4 }}>
                      <span className="muted" style={{ fontSize: 12 }}>
                        Kayıtlı oynatıcı adresi ({ozet.saglayici})
                      </span>
                      <iframe
                        src={ozet.embedUrl}
                        style={{
                          width: "100%",
                          maxWidth: 480,
                          aspectRatio: "16 / 9",
                          border: 0,
                          borderRadius: 8,
                        }}
                        allowFullScreen
                        title={`Maç ${m.id} özeti`}
                      />
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-primary"
                      disabled={kaydediliyor || !adres.trim()}
                      onClick={() => void kaydet(m.id)}
                    >
                      {kaydediliyor ? "Kaydediliyor…" : "Kaydet"}
                    </button>
                    {ozet && (
                      <button
                        className="btn btn-danger"
                        disabled={kaydediliyor}
                        onClick={() => void sil(m.id)}
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
