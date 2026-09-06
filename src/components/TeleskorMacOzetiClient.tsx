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

/**
 * Tarih aritmetiği YEREL saatle, `toISOString()` ile DEĞİL.
 *
 * <p>`toISOString()` UTC'ye çeviriyor: Türkiye +03 olduğu için gece
 * 00:00-03:00 arasında panele bakan yönetici bir gün geriye kayardı ve
 * "dün" iki gün önceyi gösterirdi. Sessiz bir hata olurdu — ekranda
 * maçlar yine gelir, yalnız yanlış günün maçları gelirdi.
 */
function gunAdresi(d: Date): string {
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  const gun = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${ay}-${gun}`;
}

function bugunTarihi(): string {
  return gunAdresi(new Date());
}

function dunTarihi(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return gunAdresi(d);
}

/** Seçili günü n gün kaydırır (ok tuşları). */
function gunKaydir(tarih: string, n: number): string {
  const [y, a, g] = tarih.split("-").map(Number);
  const d = new Date(y, (a ?? 1) - 1, g ?? 1);
  d.setDate(d.getDate() + n);
  return gunAdresi(d);
}

/** "6 Eylül Cumartesi" — takvim açmadan hangi güne bakıldığı görünsün. */
function gunEtiketi(tarih: string): string {
  const [y, a, g] = tarih.split("-").map(Number);
  if (!y || !a || !g) return tarih;
  return new Date(y, a - 1, g).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
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

  /** Araç çubuğundaki sayaç — "bu günde kaç maçın özeti girilmiş". */
  const ozetSayisi = useMemo(
    () => maclar.filter((m) => ozetler[String(m.id)]).length,
    [maclar, ozetler],
  );

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

      <div className="ozet-arac">
        {/* TARİH GEZİNMESİ — asıl kazanç görünüm değil, ok tuşları.
            Yönetici gün gün geziyor; her gün için takvim açmak
            gereksiz iki tıktı. */}
        <div className="ozet-tarih">
          <button
            type="button"
            title="Önceki gün"
            aria-label="Önceki gün"
            onClick={() => setTarih((t) => gunKaydir(t, -1))}
          >
            ‹
          </button>
          <input
            type="date"
            value={tarih}
            // Boş değer YOK SAYILIYOR: kullanıcı alanı temizlediğinde
            // (ya da yarım tarih yazarken) tarayıcı boş metin gönderiyor
            // ve o hâliyle sunucuya gidilseydi "Tarih YYYY-AA-GG
            // biçiminde olmalı" hatası çıkardı.
            onChange={(e) => e.target.value && setTarih(e.target.value)}
          />
          {/* İLERİ GİTMEK ENGELLENMİYOR: bu ekranın kuralı "engelleme,
              söyle" (bitmemiş maçta da düğme açık). İleride maç yoksa
              boş durum kutusu zaten sebebini yazıyor. */}
          <button
            type="button"
            title="Sonraki gün"
            aria-label="Sonraki gün"
            onClick={() => setTarih((t) => gunKaydir(t, 1))}
          >
            ›
          </button>
        </div>

        {/* Tarih alanının biçimini TARAYICI seçiyor (tr'de 05.09.2026,
            en'de 09/05/2026). Hangi güne bakıldığı yazıyla da yazılıyor:
            gün/ay sırası kafa karıştırmasın. */}
        <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>
          {gunEtiketi(tarih)}
        </span>

        <div className="ozet-seg">
          <button
            type="button"
            aria-pressed={tarih === dunTarihi()}
            onClick={() => setTarih(dunTarihi())}
          >
            Dün
          </button>
          <button
            type="button"
            aria-pressed={tarih === bugunTarihi()}
            onClick={() => setTarih(bugunTarihi())}
          >
            Bugün
          </button>
        </div>

        {/* İKİ SEÇENEK İÇİN AÇILIR KUTU YOK: seçenekleri görmek için
            tıklamak gerekiyordu ve ikisi de ekrana sığıyor. */}
        <div className="ozet-seg">
          <button
            type="button"
            aria-pressed={spor === "FOOTBALL"}
            onClick={() => setSpor("FOOTBALL")}
          >
            Futbol
          </button>
          <button
            type="button"
            aria-pressed={spor === "BASKETBALL"}
            onClick={() => setSpor("BASKETBALL")}
          >
            Basketbol
          </button>
        </div>

        <span className="ozet-esnek" />

        <span className="muted" style={{ fontSize: 12.5 }}>
          {yukleniyor
            ? "Yükleniyor…"
            : `${sirali.length} maç · ${ozetSayisi} özet`}
        </span>
        <button
          className="btn btn-sm"
          onClick={() => void yukle()}
          disabled={yukleniyor}
        >
          Yenile
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}
      {bilgi && <div className="alert">{bilgi}</div>}

      {!yukleniyor && sirali.length === 0 && (
        <div className="state-box">
          <div className="big">Bu günde maç yok</div>
          Başka bir tarih seç ya da sporu değiştir.
        </div>
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
              <div className="ozet-satir">
                <span className="ozet-saat">{saat(m.kickoffAt)}</span>
                <span className="ozet-eslesme">
                  <b>{m.homeTeam?.name ?? "?"}</b>
                  <span className="ozet-skor">{skor(m)}</span>
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
                  <span className="badge badge-scheduled">maç bitmedi</span>
                )}
                {ozet && (
                  <span
                    className={
                      ozet.yayinda
                        ? "badge badge-published"
                        : "badge badge-draft"
                    }
                    title={ozet.embedUrl}
                  >
                    <span className="badge-dot" />
                    {ozet.yayinda ? "özet var" : "yayında değil"}
                  </span>
                )}
                <button
                  className={acik ? "btn btn-sm" : "btn btn-sm btn-primary"}
                  onClick={() => (acik ? setAcikMac(null) : ac(m))}
                >
                  {acik ? "Kapat" : ozet ? "Düzenle" : "Özet ekle"}
                </button>
              </div>

              {acik && (
                <div style={{ display: "grid", gap: 8 }}>
                  <div>
                    <span className="label">
                      Video bağlantısı veya iframe kodu
                    </span>
                    <textarea
                      className="textarea"
                      rows={3}
                      value={adres}
                      placeholder="https://www.youtube.com/watch?v=..."
                      onChange={(e) => setAdres(e.target.value)}
                    />
                  </div>
                  <div>
                    <span className="label">Başlık</span>
                    <input
                      className="input"
                      value={baslik}
                      maxLength={160}
                      placeholder={`${m.homeTeam?.name ?? ""} ${skor(m)} ${m.awayTeam?.name ?? ""} | Özet`}
                      onChange={(e) => setBaslik(e.target.value)}
                    />
                    <div className="hint">
                      İsteğe bağlı — boş bırakırsan &quot;Maç özeti&quot; yazar.
                    </div>
                  </div>
                  <label
                    className="check-row"
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      type="checkbox"
                      checked={yayinda}
                      onChange={(e) => setYayinda(e.target.checked)}
                    />
                    <span style={{ fontSize: 13 }}>
                      Yayında{" "}
                      <span className="muted">
                        (kapatırsan uygulamada sekme çıkmaz, kayıt durur)
                      </span>
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
