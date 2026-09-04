"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiTeleskorDestekMedya,
  apiTeleskorSurumNotlari,
  apiTeleskorSurumNotuDuzelt,
  apiTeleskorSurumNotuSil,
  apiTeleskorSurumNotuYaz,
} from "@/lib/api-client";
import type { SurumNotu } from "@/lib/types";

/** Bir sürüm notuna en fazla kaç görsel — sunucudaki sınırla aynı. */
const EN_FAZLA_GORSEL = 4;

interface YuklenenEk {
  id: number;
  ad: string;
}

/**
 * SÜRÜM NOTLARI — "Neler değişti" metinlerinin yazıldığı yer.
 *
 * <h3>Bu sayfa Duyurular'dan AYRI ve öyle kalmalı</h3>
 * Kullanıcı ikisini aynı listede (Gelen Kutusu) okuyor ama yazma
 * tarafları farklı: duyuru geri alınamaz bir gönderim, sürüm notu
 * düzeltilebilir bir belge. Tek sayfaya konsalardı "gönder" düğmesinin
 * bazen bildirim atıp bazen atmaması gerekirdi — ve o fark bir onay
 * kutusuna bağlansaydı yanlış tıklanan gün geri alınamazdı.
 *
 * <h3>GÖRSEL SEÇİLİR SEÇİLMEZ YÜKLENİYOR</h3>
 * Kaydete basınca değil. Tek istekte gitseydi büyük bir dosya
 * yüklenirken ağ koptuğunda YAZILAN METİN de kaybolurdu (destek
 * cevabındaki kararın aynısı).
 */
export default function TeleskorSurumNotuClient() {
  const [liste, setListe] = useState<SurumNotu[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const [surum, setSurum] = useState("");
  const [minSurum, setMinSurum] = useState("");
  const [baslik, setBaslik] = useState("");
  const [metin, setMetin] = useState("");
  const [yayinAt, setYayinAt] = useState("");
  const [ekler, setEkler] = useState<YuklenenEk[]>([]);
  const [ekYukleniyor, setEkYukleniyor] = useState(0);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const dosyaSecici = useRef<HTMLInputElement | null>(null);

  const [duzeltilen, setDuzeltilen] = useState<number | null>(null);
  const [dBaslik, setDBaslik] = useState("");
  const [dMetin, setDMetin] = useState("");

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      setListe(await apiTeleskorSurumNotlari());
      setHata(null);
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Sürüm notları alınamadı.");
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  async function dosyaEkle(secilen: FileList | null) {
    if (!secilen || secilen.length === 0) return;
    const kalan = EN_FAZLA_GORSEL - ekler.length;
    if (kalan <= 0) {
      setHata(`En fazla ${EN_FAZLA_GORSEL} görsel eklenebilir.`);
      return;
    }
    // SIRAYLA yükleniyor: aynı anda dört istek, Teleskor'un saatlik
    // yükleme kotasını daha hızlı tüketmenin yanında hangi dosyanın
    // hangi hatayı verdiğini de belirsizleştirirdi.
    for (const dosya of Array.from(secilen).slice(0, kalan)) {
      setEkYukleniyor((n) => n + 1);
      try {
        const r = await apiTeleskorDestekMedya(dosya);
        setEkler((mevcut) => [...mevcut, { id: r.id, ad: dosya.name }]);
        setHata(null);
      } catch (e) {
        setHata(e instanceof Error ? e.message : "Dosya yüklenemedi.");
      } finally {
        setEkYukleniyor((n) => n - 1);
      }
    }
  }

  async function kaydet() {
    if (kaydediliyor || ekYukleniyor > 0) return;
    setKaydediliyor(true);
    try {
      await apiTeleskorSurumNotuYaz({
        surum: surum.trim(),
        baslik: baslik.trim(),
        metin: metin.trim(),
        minSurum: minSurum.trim() || undefined,
        // datetime-local YEREL saat veriyor ve sonunda "Z" yok; Date
        // ile ISO'ya çevirmek zorunlu, yoksa sunucu değeri UTC sanıp
        // notu üç saat erken yayınlardı.
        yayinAt: yayinAt ? new Date(yayinAt).toISOString() : undefined,
        medyaIdler: ekler.map((e) => e.id),
      });
      setSurum("");
      setMinSurum("");
      setBaslik("");
      setMetin("");
      setYayinAt("");
      setEkler([]);
      setHata(null);
      await yukle();
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
    } finally {
      setKaydediliyor(false);
    }
  }

  async function duzeltmeyiKaydet(id: number) {
    try {
      await apiTeleskorSurumNotuDuzelt(id, dBaslik.trim(), dMetin.trim());
      setDuzeltilen(null);
      setHata(null);
      await yukle();
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Düzeltilemedi.");
    }
  }

  async function sil(id: number) {
    if (!confirm("Bu sürüm notu silinsin mi? Görselleri de silinecek.")) return;
    try {
      await apiTeleskorSurumNotuSil(id);
      setHata(null);
      await yukle();
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Silinemedi.");
    }
  }

  return (
    <div className="stack">
      {hata && <div className="alert alert-error">{hata}</div>}

      <div className="card card-pad stack">
        <div className="card-title">Yeni sürüm notu</div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Kullanıcı bunu uygulamadaki <b>Gelen Kutusu</b>&apos;nda okuyor.
          <b> Bildirim gitmez</b> — duyurulmasını istiyorsan Duyurular
          sayfasından ayrıca bir duyuru gönder.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label className="stack" style={{ gap: 4, minWidth: 160 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Sürüm (ör. 1.0.72)
            </span>
            <input
              className="input"
              value={surum}
              onChange={(e) => setSurum(e.target.value)}
              placeholder="1.0.72"
            />
          </label>
          <label className="stack" style={{ gap: 4, minWidth: 200 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Şu sürümden itibaren görünsün (boşsa yukarıdaki)
            </span>
            <input
              className="input"
              value={minSurum}
              onChange={(e) => setMinSurum(e.target.value)}
              placeholder="1.0.72"
            />
          </label>
          <label className="stack" style={{ gap: 4, minWidth: 220 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Yayın zamanı (boşsa hemen)
            </span>
            <input
              className="input"
              type="datetime-local"
              value={yayinAt}
              onChange={(e) => setYayinAt(e.target.value)}
            />
          </label>
        </div>

        <input
          className="input"
          value={baslik}
          onChange={(e) => setBaslik(e.target.value)}
          placeholder="Başlık — ör. Akışta yenilikler"
          maxLength={120}
        />
        <textarea
          className="input"
          value={metin}
          onChange={(e) => setMetin(e.target.value)}
          placeholder="Neler değişti? Kullanıcının okuyacağı metin."
          rows={5}
          maxLength={1000}
        />

        {ekler.length > 0 && (
          <div className="stack" style={{ gap: 4 }}>
            {ekler.map((e) => (
              <div key={e.id} className="spread" style={{ fontSize: 13 }}>
                <span>📎 {e.ad}</span>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() =>
                    setEkler((m) => m.filter((x) => x.id !== e.id))
                  }
                >
                  Kaldır
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={dosyaSecici}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
          style={{ display: "none" }}
          onChange={(e) => {
            void dosyaEkle(e.target.files);
            // Aynı dosya ikinci kez seçilebilsin: değer sıfırlanmazsa
            // tarayıcı "değişmedi" deyip olayı hiç tetiklemiyor.
            e.target.value = "";
          }}
        />

        <div className="spread">
          <button
            className="btn btn-ghost"
            onClick={() => dosyaSecici.current?.click()}
            disabled={ekler.length >= EN_FAZLA_GORSEL || ekYukleniyor > 0}
          >
            📎 Görsel ekle
          </button>
          <button
            className="btn btn-primary"
            onClick={() => void kaydet()}
            disabled={
              kaydediliyor ||
              ekYukleniyor > 0 ||
              !surum.trim() ||
              !baslik.trim() ||
              !metin.trim()
            }
          >
            {ekYukleniyor > 0
              ? "Görsel yükleniyor…"
              : kaydediliyor
                ? "Kaydediliyor…"
                : "Kaydet"}
          </button>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          En fazla {EN_FAZLA_GORSEL} dosya, tek video. Görsel seçilir
          seçilmez yükleniyor.
        </div>
      </div>

      <div className="card card-pad stack">
        <div className="card-title">Yazılmış notlar</div>
        {yukleniyor && <div className="muted">Yükleniyor…</div>}
        {!yukleniyor && liste.length === 0 && (
          <div className="muted">Henüz sürüm notu yok.</div>
        )}
        {liste.map((n) => (
          <div
            key={n.id}
            className="stack"
            style={{
              gap: 6,
              borderTop: "1px solid var(--border, #e5e7eb)",
              paddingTop: 10,
            }}
          >
            <div className="spread">
              <div>
                <b>{n.surum}</b>{" "}
                {!n.yayinda && (
                  <span className="muted" style={{ fontSize: 12 }}>
                    · yayınlanmadı ({new Date(n.yayinAt).toLocaleString("tr-TR")})
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    setDuzeltilen(n.id);
                    setDBaslik(n.baslik);
                    setDMetin(n.metin);
                  }}
                >
                  Düzelt
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => void sil(n.id)}
                >
                  Sil
                </button>
              </div>
            </div>

            {duzeltilen === n.id ? (
              <div className="stack" style={{ gap: 6 }}>
                <input
                  className="input"
                  value={dBaslik}
                  onChange={(e) => setDBaslik(e.target.value)}
                  maxLength={120}
                />
                <textarea
                  className="input"
                  value={dMetin}
                  onChange={(e) => setDMetin(e.target.value)}
                  rows={4}
                  maxLength={1000}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => void duzeltmeyiKaydet(n.id)}
                  >
                    Kaydet
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setDuzeltilen(null)}
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 600 }}>{n.baslik}</div>
                <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
                  {n.metin}
                </div>
              </>
            )}

            {n.medya.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {n.medya.map((m, i) =>
                  m.tur === "VIDEO" ? (
                    <video
                      key={i}
                      src={m.video}
                      poster={m.kucuk}
                      controls
                      style={{ maxHeight: 120, borderRadius: 6 }}
                    />
                  ) : (
                    <a
                      key={i}
                      href={m.buyuk}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.kucuk ?? m.buyuk}
                        alt=""
                        style={{ maxHeight: 120, borderRadius: 6 }}
                      />
                    </a>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
