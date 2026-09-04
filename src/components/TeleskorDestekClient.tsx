"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiTeleskorDestekListe,
  apiTeleskorDestekYazisma,
  apiTeleskorDestekCevap,
  apiTeleskorDestekMedya,
  apiTeleskorDestekDurum,
  ApiError,
} from "@/lib/api-client";
import type {
  TeleskorDestekEki,
  TeleskorDestekTalebi,
  TeleskorDestekYazismasi,
} from "@/lib/types";
import { formatDate } from "@/lib/format";

/**
 * DESTEK — uygulamadaki "Bize Ulaşın" yazışması.
 *
 * <h3>Buradan yazılan cevabı kullanıcı UYGULAMADAN okuyor</h3>
 * Eskiden Teleskor mesajları ScoresTV'nin iletişim kutusuna düşüyordu ve
 * "Yanıtla" düğmesi bir {@code mailto:} bağlantısıydı: cevap yöneticinin
 * kendi posta programından gidiyor, hiçbir yerde saklanmıyordu — yani
 * kullanıcının uygulamada okuyabileceği bir cevap YOKTU. Serhat'ın kararı
 * (3 Eylül): yazışma teleskor-backend'e taşındı. Cevap yazılınca
 * kullanıcıya bildirim de gidiyor.
 *
 * <h3>İki sütun: liste + yazışma</h3>
 * Yazışma ayrı bir sayfada olsaydı yönetici her cevaptan sonra listeye
 * dönmek zorunda kalırdı. Solda talepler, sağda seçili yazışma.
 *
 * <h3>Talebi açmak listeyi TAZELİYOR</h3>
 * Sunucu {@code GET /admin/destek/{id}} çağrısında "yönetici okudu"
 * damgasını atıyor; listedeki okunmamış rozeti ancak yeniden okunursa
 * düşer. Rozeti yerel olarak sıfırlamak daha ucuzdu ama ekranla
 * veritabanı ayrışırdı: başka bir yönetici aynı anda cevap yazmış olabilir.
 */
export default function TeleskorDestekClient() {
  const [talepler, setTalepler] = useState<TeleskorDestekTalebi[]>([]);
  const [secili, setSecili] = useState<TeleskorDestekYazismasi | null>(null);
  const [seciliId, setSeciliId] = useState<number | null>(null);
  const [durumSuzgeci, setDurumSuzgeci] = useState<string>("");
  const [cevap, setCevap] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  /// BÜYÜTÜLEN GÖRSEL — modalda açık olanın adresi.
  ///
  /// Serhat (3 Eylül): "Panelde gelen fotoğrafa tıklayınca modalda
  /// açılsın yeni sayfada değil." Yeni sekme yöneticiyi paneldeki
  /// yazışmadan koparıyordu: bakmak için sekme değiştir, kapat, geri
  /// dön. Modal aynı ekranda kalıyor.
  const [buyutulen, setBuyutulen] = useState<string | null>(null);

  /// CEVABA İLİŞTİRİLECEK DOSYALAR — yüklenmiş, henüz gönderilmemiş.
  ///
  /// Dosya "Cevabı gönder"e basınca değil, SEÇİLİR SEÇİLMEZ yükleniyor:
  /// 50 MB'lık bir video gönderme anında yüklenseydi yönetici saniyelerce
  /// bekler ve ağ koptuğunda yazdığı metni de kaybederdi.
  const [ekler, setEkler] = useState<{ id: number; ad: string }[]>([]);
  const [ekYukleniyor, setEkYukleniyor] = useState(0);
  const dosyaSecici = useRef<HTMLInputElement | null>(null);

  /** Gönderiyle AYNI sınır — aynı kavramın iki ekranda farklı davranmaması için. */
  const EN_FAZLA_EK = 4;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTalepler(await apiTeleskorDestekListe(durumSuzgeci || undefined, 100));
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Liste alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [durumSuzgeci]);

  useEffect(() => {
    void load();
  }, [load]);

  const ac = useCallback(
    async (id: number) => {
      setSeciliId(id);
      setCevap("");
      // EKLER DE SIFIRLANIYOR: başka bir talebe geçilince yüklenmiş
      // dosyalar orada durursa yanlış yazışmaya iliştirilirdi. Sunucuda
      // iliştirilmemiş dosya bir gün sonra kendiliğinden temizleniyor.
      setEkler([]);
      try {
        setSecili(await apiTeleskorDestekYazisma(id));
        setHata(null);
        // Açmak "yönetici okudu" damgası atıyor; listedeki rozet düşsün.
        await load();
      } catch (e) {
        setHata(e instanceof ApiError ? e.message : "Yazışma alınamadı.");
      }
    },
    [load],
  );

  async function gonder() {
    if (!seciliId || !cevap.trim() || busy || ekYukleniyor > 0) return;
    setBusy(true);
    try {
      setSecili(
        await apiTeleskorDestekCevap(
          seciliId,
          cevap.trim(),
          ekler.map((e) => e.id),
        ),
      );
      setCevap("");
      setEkler([]);
      setHata(null);
      await load();
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Cevap gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Seçilen dosyaları SIRAYLA yükler.
   *
   * <p>Paralel değil: sunucuda saatlik bir yükleme kotası var ve hepsi
   * aynı anda gidince kotaya tek seferde yükleniyor. Sıra ayrıca hata
   * mesajını da anlamlı kılıyor — hangi dosyada takıldığı belli oluyor.
   */
  async function dosyaEkle(secilenler: FileList | null) {
    if (!secilenler || secilenler.length === 0) return;
    const yer = EN_FAZLA_EK - ekler.length - ekYukleniyor;
    if (yer <= 0) {
      setHata(`Bir cevaba en fazla ${EN_FAZLA_EK} dosya eklenebilir.`);
      return;
    }
    const liste = Array.from(secilenler).slice(0, yer);
    setEkYukleniyor((n) => n + liste.length);
    for (const dosya of liste) {
      try {
        const y = await apiTeleskorDestekMedya(dosya);
        setEkler((mevcut) => [...mevcut, { id: y.id, ad: dosya.name }]);
        setHata(null);
      } catch (e) {
        // SUNUCUNUN MESAJI gösteriliyor: "saatlik sınıra ulaştın" ya da
        // "en fazla 5 MB" gibi cümleler ne yapılacağını söylüyor.
        setHata(
          e instanceof ApiError ? e.message : `${dosya.name} yüklenemedi.`,
        );
      } finally {
        setEkYukleniyor((n) => n - 1);
      }
    }
  }

  async function durumDegistir(durum: string) {
    if (!seciliId || busy) return;
    setBusy(true);
    try {
      await apiTeleskorDestekDurum(seciliId, durum);
      await ac(seciliId);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Durum güncellenemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Teleskor — Destek</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Buraya yazdığın cevabı kullanıcı <b>uygulamadan</b> okuyor ve
            bildirim alıyor. Teleskor mesajları artık ScoresTV&apos;nin
            Mesajlar sayfasına düşmüyor.
          </div>
        </div>
        <div className="row">
          <select
            className="select"
            value={durumSuzgeci}
            onChange={(e) => setDurumSuzgeci(e.target.value)}
          >
            <option value="">Açık olanlar</option>
            <option value="ACIK">Bekleyen</option>
            <option value="CEVAPLANDI">Cevaplanmış</option>
            <option value="KAPALI">Kapanmış</option>
          </select>
          <button className="btn" disabled={loading} onClick={() => void load()}>
            {loading ? "Yükleniyor…" : "Yenile"}
          </button>
        </div>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      <div className="destek-grid">
        <div className="card destek-liste">
          {loading && talepler.length === 0 && (
            <div className="destek-bos muted">Yükleniyor…</div>
          )}
          {!loading && talepler.length === 0 && (
            <div className="destek-bos muted">Bu süzgeçte talep yok.</div>
          )}
          {talepler.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`destek-satir${seciliId === t.id ? " aktif" : ""}`}
              onClick={() => void ac(t.id)}
            >
              <div className="destek-satir-ust">
                <span className="destek-konu">{t.konu}</span>
                {t.okunmamis > 0 && (
                  <span className="badge badge-lang">{t.okunmamis}</span>
                )}
              </div>
              <div className="destek-onizleme">{t.onizleme}</div>
              <div className="destek-alt muted">
                <span>{t.gorunenAd || t.kullaniciAdi || "—"}</span>
                <span>{formatDate(t.sonMesajAn)}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="card destek-yazisma">
          {!secili && (
            <div className="destek-bos muted">Soldan bir talep seç.</div>
          )}
          {secili && (
            <>
              <div className="destek-baslik">
                <div>
                  <b>{secili.konu}</b>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {secili.gorunenAd || secili.kullaniciAdi}
                    {secili.eposta ? ` · ${secili.eposta}` : ""}
                  </div>
                </div>
                <div className="row">
                  <span className={`badge ${durumRozeti(secili.durum)}`}>
                    {DURUM_TR[secili.durum] ?? secili.durum}
                  </span>
                  {secili.durum !== "KAPALI" ? (
                    <button
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={() => void durumDegistir("KAPALI")}
                    >
                      Kapat
                    </button>
                  ) : (
                    <button
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={() => void durumDegistir("ACIK")}
                    >
                      Yeniden aç
                    </button>
                  )}
                </div>
              </div>

              <div className="destek-mesajlar">
                {secili.mesajlar.map((m) => (
                  <div
                    key={m.id}
                    className={`destek-balon ${
                      m.yazan === "ADMIN" ? "bizden" : "kullanici"
                    }`}
                  >
                    <div className="destek-balon-ust">
                      {m.yazan === "ADMIN"
                        // PANELDE GERÇEK AD DURUYOR: kimin cevap yazdığını
                        // görmek işin gereği. Kullanıcı yolunda sunucu bu
                        // alanı hiç göndermiyor ve uygulama "Teleskor
                        // Ekibi" yazıyor (Serhat, 3 Eylül) — destek
                        // personelinin adı kullanıcıya gösterilmiyor.
                        ? m.adminAd || "Teleskor Ekibi"
                        : secili.gorunenAd || secili.kullaniciAdi || "Kullanıcı"}
                      <span className="muted"> · {formatDate(m.an)}</span>
                    </div>
                    <div className="destek-balon-metin">{m.metin}</div>
                    {m.medya && m.medya.length > 0 && (
                      <div className="destek-ekler">
                        {m.medya.map((ek, i) => (
                          <Ek key={i} ek={ek} onAc={setBuyutulen} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="destek-yazma">
                <textarea
                  className="input"
                  rows={4}
                  maxLength={4000}
                  placeholder="Cevabını yaz…"
                  value={cevap}
                  onChange={(e) => setCevap(e.target.value)}
                />
                {(ekler.length > 0 || ekYukleniyor > 0) && (
                  <div
                    className="stack"
                    style={{ gap: 6, marginTop: 8, marginBottom: 4 }}
                  >
                    {ekler.map((e) => (
                      <div key={e.id} className="spread">
                        <span style={{ fontSize: 12.5 }}>📎 {e.ad}</span>
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
                    {ekYukleniyor > 0 && (
                      <span className="muted" style={{ fontSize: 12 }}>
                        {ekYukleniyor} dosya yükleniyor…
                      </span>
                    )}
                  </div>
                )}

                <input
                  ref={dosyaSecici}
                  type="file"
                  hidden
                  multiple
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                  onChange={(e) => {
                    void dosyaEkle(e.target.files);
                    // AYNI DOSYA İKİNCİ KEZ SEÇİLEBİLSİN: input değeri
                    // aynı kalırsa `change` hiç tetiklenmiyor ve kullanıcı
                    // "tıkladım olmadı" diyor.
                    e.target.value = "";
                  }}
                />

                <div className="spread">
                  <div className="stack" style={{ gap: 2 }}>
                    <span className="muted" style={{ fontSize: 12 }}>
                      Cevap gidince talep &quot;Cevaplandı&quot; olur ve
                      kullanıcıya bildirim düşer.
                    </span>
                    <span className="muted" style={{ fontSize: 11.5 }}>
                      Ek: en fazla {EN_FAZLA_EK} dosya · görsel 5 MB ·
                      video 50 MB ve 60 sn.
                    </span>
                  </div>
                  <div className="stack" style={{ gap: 6 }}>
                    <button
                      className="btn btn-sm btn-ghost"
                      disabled={
                        busy || ekler.length + ekYukleniyor >= EN_FAZLA_EK
                      }
                      onClick={() => dosyaSecici.current?.click()}
                    >
                      📎 Dosya ekle
                    </button>
                    <button
                      className="btn btn-primary"
                      // EK YÜKLENİRKEN KAPALI: açık kalsaydı yönetici
                      // gönderebilir ve dosya henüz kimliği alınmadığı
                      // için sessizce dışarıda kalırdı.
                      disabled={busy || !cevap.trim() || ekYukleniyor > 0}
                      onClick={() => void gonder()}
                    >
                      {busy ? "Gönderiliyor…" : "Cevabı gönder"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {buyutulen && (
        <GorselModal adres={buyutulen} onKapat={() => setBuyutulen(null)} />
      )}
    </div>
  );
}

/**
 * TEK EK — görsel ya da video.
 *
 * <h3>Video AYRI bir etiket, kapak görseli DEĞİL</h3>
 * Uygulamada kapağa dokunulunca oynatıcı açılıyor; panelde tarayıcının
 * kendi oynatıcısı var ve videoyu kapak görseli gibi göstermek
 * yöneticiyi "neden oynamıyor?" diye uğraştırırdı. `poster` kapak
 * karesi: video yüklenmeden önce de bir şey görünüyor.
 *
 * <h3>Adres yoksa hiçbir şey çizilmiyor</h3>
 * CDN tabanı tanımsız bir kurulumda sunucu adres göndermiyor; boş
 * `src` ile bir etiket çizmek kırık resim ikonu üretirdi.
 */
function Ek({
  ek,
  onAc,
}: {
  ek: TeleskorDestekEki;
  onAc: (adres: string) => void;
}) {
  if (ek.tur === "VIDEO") {
    if (!ek.video) return null;
    return (
      <video
        className="destek-ek"
        src={ek.video}
        poster={ek.kucuk || undefined}
        controls
        preload="metadata"
      />
    );
  }
  const adres = ek.buyuk || ek.kucuk;
  if (!adres) return null;
  // TAM BOYUT MODALDA, yeni sekmede DEĞİL (Serhat, 3 Eylül).
  //
  // Düğme, bağlantı değil: bu artık başka bir adrese gitmiyor, aynı
  // sayfada bir katman açıyor. <a> kalsaydı orta tıklama ve "yeni
  // sekmede aç" hâlâ ham dosyayı açar, yani iki farklı davranış
  // olurdu. Ayrıca klavyeyle de çalışıyor.
  return (
    <button
      type="button"
      className="destek-ek-dugme"
      onClick={() => onAc(adres)}
      title="Büyüt"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="destek-ek" src={ek.kucuk || adres} alt="Ek" />
    </button>
  );
}

/**
 * GÖRSEL MODALI.
 *
 * <h3>Kapanış üç yoldan</h3>
 * Zemine tıklama, sağ üstteki düğme ve Esc. Üçü de olağan beklenti;
 * biri eksik olsaydı yönetici modalı kapatmanın yolunu ararken
 * yazışmayı kaybederdi.
 *
 * <h3>Görsel `.modal` kabuğuna KONMUYOR</h3>
 * O kabuk beyaz zeminli bir kart; ekran görüntüsü genelde beyaz
 * zeminli olduğu için görselin nerede bitip kartın nerede başladığı
 * belirsizleşirdi. Burada görsel doğrudan koyu zeminin üstünde ve
 * ekranın büyük kısmını kullanıyor.
 */
function GorselModal({
  adres,
  onKapat,
}: {
  adres: string;
  onKapat: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onKapat();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onKapat]);

  return (
    <div
      className="modal-overlay destek-lightbox"
      style={{ zIndex: 120 }}
      onClick={onKapat}
    >
      <button
        type="button"
        className="btn btn-sm destek-lightbox-kapat"
        onClick={onKapat}
      >
        Kapat
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="destek-lightbox-gorsel"
        src={adres}
        alt="Ek"
        // Görselin kendisine tıklamak KAPATMIYOR: yönetici ayrıntıya
        // bakmak için üstüne tıklayabilir ve modalın kaybolması
        // şaşırtıcı olurdu. Zemin kapatıyor.
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

const DURUM_TR: Record<string, string> = {
  ACIK: "Bekliyor",
  CEVAPLANDI: "Cevaplandı",
  KAPALI: "Kapandı",
};

/** Tanınmayan durum nötr rozetle görünür — ekranda boşluk kalmasın. */
function durumRozeti(durum: string): string {
  if (durum === "ACIK") return "badge-scheduled";
  if (durum === "CEVAPLANDI") return "badge-published";
  return "badge-archived";
}
