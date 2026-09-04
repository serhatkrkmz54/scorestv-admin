"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiTeleskorOneCikanLigler,
  apiTeleskorOneCikanLigKaydet,
  apiTeleskorLigAra,
  ApiError,
} from "@/lib/api-client";
import type {
  OneCikanLig,
  OneCikanLigYaniti,
  OneCikanLigAramaSatiri,
} from "@/lib/types";

const SPORLAR = [
  { deger: "FOOTBALL", ad: "Futbol" },
  { deger: "BASKETBALL", ad: "Basketbol" },
];

/** Listedeki bir satır — düzenleme sırasında bellekte tutulan hâli. */
type Satir = {
  saglayiciId: string;
  ad: string | null;
  logo: string | null;
  ulke: string | null;
  ulkeBayrak: string | null;
  /** Motorda karşılığı bulunamadı: anasayfada bu kart HİÇ çıkmıyor. */
  cozulemedi: boolean;
};

function satiraCevir(l: OneCikanLig): Satir {
  return {
    saglayiciId: l.saglayiciId,
    // Ad motorun katalogundan geliyor; çözülemeyen ligde panelin elinde
    // yalnız not kalıyor (o da yalnız panelden eklenen satırlarda var).
    ad: l.ad ?? l.adNotu ?? null,
    logo: l.logo ?? null,
    ulke: l.ulke ?? null,
    ulkeBayrak: l.ulkeBayrak ?? null,
    cozulemedi: l.ligId == null,
  };
}

/** Yuvarlak logo; yoksa baş harf rozeti (kırık görsel yerine). */
function Logo({ src, ad }: { src: string | null; ad: string | null }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={28}
        height={28}
        style={{
          borderRadius: "50%",
          objectFit: "contain",
          background: "#fff",
          flex: "0 0 auto",
        }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
        }}
      />
    );
  }
  return (
    <div
      aria-hidden
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "var(--border, #e5e7eb)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        flex: "0 0 auto",
      }}
    >
      {(ad ?? "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

/**
 * ÖNE ÇIKAN LİGLER — anasayfanın üst bloğu.
 *
 * <h3>Neden bu ekran var</h3>
 * Liste bugüne kadar api-1'in {@code .env}'indeydi: bir lig eklemek, bir
 * kupayı sezon sonunda aşağı almak ya da sırayı değiştirmek servisi
 * yeniden başlatmak demekti. "Hangi lig önemli" teknik değil EDİTORYAL
 * bir karar; artık burada.
 *
 * <h3>Kaydetme BÜTÜN listeyi yazıyor</h3>
 * Her düğme ayrı istek atmıyor: ekranda düzenliyorsun, "Kaydet" bir kez
 * gönderiyor. Parçalı olsaydı iki yönetici aynı anda düzenlediğinde sıra
 * numaraları çakışırdı.
 */
export default function TeleskorOneCikanLiglerClient() {
  const [spor, setSpor] = useState("FOOTBALL");
  const [sunucu, setSunucu] = useState<OneCikanLigYaniti | null>(null);
  const [satirlar, setSatirlar] = useState<Satir[]>([]);
  const [kirli, setKirli] = useState(false);
  const [gerekce, setGerekce] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  const [arama, setArama] = useState("");
  const [sonuclar, setSonuclar] = useState<OneCikanLigAramaSatiri[]>([]);
  const [araniyor, setAraniyor] = useState(false);

  const yukle = useCallback(async (hedefSpor: string) => {
    setYukleniyor(true);
    setHata(null);
    try {
      const y = await apiTeleskorOneCikanLigler(hedefSpor);
      setSunucu(y);
      setSatirlar(y.ligler.map(satiraCevir));
      setKirli(false);
      setGerekce("");
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Liste alınamadı.");
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void yukle(spor);
    setArama("");
    setSonuclar([]);
  }, [spor, yukle]);

  // ARAMA BEKLETİCİSİ: her harfte istek atmak motora gereksiz yük.
  // Bayat sonuç ekrana BASILMIYOR — kutu değiştiyse atılıyor (uygulamanın
  // onboarding aramasındaki kararın aynısı).
  useEffect(() => {
    const q = arama.trim();
    if (q.length < 2) {
      setSonuclar([]);
      return;
    }
    let iptal = false;
    setAraniyor(true);
    const zaman = setTimeout(async () => {
      try {
        const r = await apiTeleskorLigAra(spor, q);
        if (!iptal) setSonuclar(r);
      } catch {
        if (!iptal) setSonuclar([]);
      } finally {
        if (!iptal) setAraniyor(false);
      }
    }, 350);
    return () => {
      iptal = true;
      clearTimeout(zaman);
    };
  }, [arama, spor]);

  function tasi(i: number, yon: -1 | 1) {
    const hedef = i + yon;
    if (hedef < 0 || hedef >= satirlar.length) return;
    const kopya = [...satirlar];
    [kopya[i], kopya[hedef]] = [kopya[hedef], kopya[i]];
    setSatirlar(kopya);
    setKirli(true);
  }

  function cikar(i: number) {
    setSatirlar(satirlar.filter((_, j) => j !== i));
    setKirli(true);
  }

  function ekle(s: OneCikanLigAramaSatiri) {
    if (!s.saglayiciId) return;
    if (satirlar.some((x) => x.saglayiciId === s.saglayiciId)) {
      setBilgi("Bu lig listede zaten var.");
      return;
    }
    setSatirlar([
      ...satirlar,
      {
        saglayiciId: s.saglayiciId,
        ad: s.ad ?? null,
        logo: s.logo ?? null,
        ulke: s.ulke ?? null,
        ulkeBayrak: s.ulkeBayrak ?? null,
        cozulemedi: false,
      },
    ]);
    setKirli(true);
    setBilgi(null);
  }

  async function kaydet() {
    if (!gerekce.trim()) return;
    setKaydediliyor(true);
    setHata(null);
    setBilgi(null);
    try {
      const y = await apiTeleskorOneCikanLigKaydet({
        spor,
        // Ad NOT olarak gidiyor: panelde kimliğin yanında dursun diye.
        // Ekranda gösterilen ad her zaman motorun katalogundan geliyor,
        // bu nottan DEĞİL — yoksa Serhat'ın motordaki çeviri
        // düzeltmeleri burada görünmezdi.
        ligler: satirlar.map((s) => ({
          saglayiciId: s.saglayiciId,
          adNotu: s.ad,
        })),
        reason: gerekce,
      });
      setSunucu(y);
      setSatirlar(y.ligler.map(satiraCevir));
      setKirli(false);
      setGerekce("");
      setBilgi(
        y.kaynak === "AYAR"
          ? "Liste boşaltıldı; artık api-1'in .env listesi geçerli."
          : `Kaydedildi. Anasayfada ${y.toplam} lig gösterilecek.`,
      );
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Liste kaydedilemedi.");
    } finally {
      setKaydediliyor(false);
    }
  }

  const cozulemeyen = satirlar.filter((s) => s.cozulemedi).length;

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Teleskor — Öne çıkan ligler</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Uygulamanın anasayfasında en üstte duran lig bloğu. Buradaki sıra,
            ekrandaki sıradır.
          </div>
        </div>
        <select
          className="select"
          style={{ width: 160 }}
          value={spor}
          onChange={(e) => {
            if (
              kirli &&
              !confirm("Kaydedilmemiş değişiklikler var. Yine de geçilsin mi?")
            ) {
              return;
            }
            setSpor(e.target.value);
          }}
        >
          {SPORLAR.map((s) => (
            <option key={s.deger} value={s.deger}>
              {s.ad}
            </option>
          ))}
        </select>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}
      {bilgi && <div className="card card-pad">{bilgi}</div>}

      {/* KAYNAK AÇIKÇA YAZIYOR. "Kaydettim ama anasayfada değişmedi"
          sorusunun ilk cevabı bu: liste hâlâ .env'den mi geliyor? */}
      {sunucu && (
        <div className="card card-pad">
          <div className="stack" style={{ gap: 6 }}>
            <div>
              <b>Kaynak:</b>{" "}
              {sunucu.kaynak === "PANEL" ? (
                <span className="badge badge-published">PANEL</span>
              ) : (
                <span className="badge badge-scheduled">.env AYARI</span>
              )}{" "}
              <span className="muted" style={{ fontSize: 12.5 }}>
                {sunucu.kaynak === "PANEL"
                  ? "Liste veritabanından geliyor; buradan değiştirebilirsin."
                  : "Bu sporun listesi henüz panelden kaydedilmedi; api-1'in .env dosyasındaki liste geçerli. İlk kayıttan sonra panel devralır."}
              </span>
            </div>
            {cozulemeyen > 0 && (
              <div className="alert alert-error" style={{ margin: 0 }}>
                <b>{cozulemeyen} lig motorda çözülemedi</b> — bu satırlar
                anasayfada HİÇ görünmüyor. Sebep ya yanlış bir sağlayıcı
                kimliği ya da motorun o ligi henüz çekmemiş olması.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-pad">
          <div className="card-title">Liste ({satirlar.length})</div>
          {yukleniyor ? (
            <div className="muted">Yükleniyor…</div>
          ) : satirlar.length === 0 ? (
            <div className="muted">
              Liste boş. Boş kaydedilirse .env'deki liste geçerli olur.
            </div>
          ) : (
            <div className="stack" style={{ gap: 6 }}>
              {satirlar.map((s, i) => (
                <div
                  key={s.saglayiciId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    border: "1px solid var(--border, #e5e7eb)",
                    borderRadius: 8,
                    opacity: s.cozulemedi ? 0.65 : 1,
                  }}
                >
                  <div
                    className="muted"
                    style={{ width: 24, fontWeight: 700, fontSize: 13 }}
                  >
                    {i + 1}
                  </div>
                  <Logo src={s.logo} ad={s.ad} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                      {s.ad ?? s.saglayiciId}
                      {s.cozulemedi && (
                        <span
                          className="badge badge-archived"
                          style={{ marginLeft: 8 }}
                        >
                          ÇÖZÜLEMEDİ
                        </span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      {s.ulke ? `${s.ulke} · ` : ""}
                      {s.saglayiciId}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm"
                    disabled={i === 0}
                    title="Yukarı taşı"
                    onClick={() => tasi(i, -1)}
                  >
                    ↑
                  </button>
                  <button
                    className="btn btn-sm"
                    disabled={i === satirlar.length - 1}
                    title="Aşağı taşı"
                    onClick={() => tasi(i, 1)}
                  >
                    ↓
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    title="Listeden çıkar"
                    onClick={() => cikar(i)}
                  >
                    Çıkar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-pad">
          <div className="card-title">Lig ekle</div>
          <div className="field">
            <input
              className="input"
              placeholder="Lig adı ara (en az 2 harf)"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
            />
          </div>
          {araniyor && <div className="muted">Aranıyor…</div>}
          {!araniyor && arama.trim().length >= 2 && sonuclar.length === 0 && (
            <div className="muted">Sonuç yok.</div>
          )}
          <div className="stack" style={{ gap: 6 }}>
            {sonuclar.map((s) => {
              const eklenmis = satirlar.some(
                (x) => x.saglayiciId === s.saglayiciId,
              );
              return (
                <div
                  key={s.ligId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 10px",
                    border: "1px solid var(--border, #e5e7eb)",
                    borderRadius: 8,
                  }}
                >
                  <Logo src={s.logo ?? null} ad={s.ad ?? null} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                      {s.ad ?? `#${s.ligId}`}
                    </div>
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      {s.ulke ? `${s.ulke} · ` : ""}
                      {/* SAĞLAYICI KİMLİĞİ YOKSA satır eklenemiyor ve
                          sebebi burada yazıyor: saklanan değer o kimlik,
                          motorun iç kimliği veritabanı yeniden kurulunca
                          değişiyor. */}
                      {s.saglayiciId ?? "sağlayıcı eşlemesi yok"}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={!s.saglayiciId || eklenmis}
                    title={
                      !s.saglayiciId
                        ? "Bu ligin sağlayıcı eşlemesi yok; listeye eklenemez."
                        : eklenmis
                          ? "Zaten listede."
                          : "Listenin sonuna ekle"
                    }
                    onClick={() => ekle(s)}
                  >
                    {eklenmis ? "Listede" : "Ekle"}
                  </button>
                </div>
              );
            })}
          </div>
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
              placeholder="Örn. Sezon başı düzenlemesi"
              value={gerekce}
              onChange={(e) => setGerekce(e.target.value)}
            />
          </div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Denetim kaydına yazılır. Kaydettiğin an anasayfa değişir —
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
              onClick={() => void yukle(spor)}
            >
              Değişiklikleri geri al
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
