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
/** IOS → "iOS", ANDROID → "Android", WEB → "Web"; bilinmiyorsa null. */
function platformEtiketi(p?: string | null): string | null {
  switch ((p ?? "").toUpperCase()) {
    case "IOS":
      return "iOS";
    case "ANDROID":
      return "Android";
    case "WEB":
      return "Web";
    default:
      return null;
  }
}

/**
 * PLATFORM İKONU (Serhat, 14 Eylül: "iOS/Android yazmasın, ikonlarını
 * kullan"). Marka logoları lucide'da YOK (bilerek çıkarıldı), bu yüzden
 * iki küçük gömülü SVG: Apple logosu ve Android robotu (Simple Icons
 * yolları, `currentColor` ile boyanıyor — rozetin rengini alıyor).
 * Web ve bilinmeyen platformda ikon yok; metin ([platformEtiketi]) kalıyor.
 */
function PlatformIkonu({
  platform,
  boyut = 12,
  title,
}: {
  platform?: string | null;
  boyut?: number;
  title?: string;
}) {
  const p = (platform ?? "").toUpperCase();
  const ortak = {
    width: boyut,
    height: boyut,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-label": title,
    role: "img" as const,
    style: { display: "block", flexShrink: 0 },
  };
  if (p === "IOS") {
    return (
      <svg {...ortak}>
        {title ? <title>{title}</title> : null}
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
      </svg>
    );
  }
  if (p === "ANDROID") {
    return (
      <svg {...ortak}>
        {title ? <title>{title}</title> : null}
        <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396" />
      </svg>
    );
  }
  return <span>{platformEtiketi(platform)}</span>;
}

/**
 * "v1.0.74 · iPhone 15 Pro" — olan parçalar, aralarında nokta. Platform
 * METİN olarak burada değil: ikonu [PlatformIkonu] çiziyor; yalnız
 * ikonu olmayan platformda (Web) adı buraya giriyor.
 */
function cihazMetni(t: {
  platform?: string | null;
  uygulamaSurumu?: string | null;
  cihazAdi?: string | null;
}): string | null {
  const p = (t.platform ?? "").toUpperCase();
  const ikonluPlatform = p === "IOS" || p === "ANDROID";
  const parcalar = [
    ikonluPlatform ? null : platformEtiketi(t.platform),
    t.uygulamaSurumu ? `v${t.uygulamaSurumu}` : null,
    t.cihazAdi || null,
  ].filter((x): x is string => !!x);
  return parcalar.length ? parcalar.join(" · ") : null;
}

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
                <span>
                  {t.gorunenAd || t.kullaniciAdi || "—"}
                  {/* PLATFORM ROZETİ (Serhat, 14 Eylül): listeden bakarken
                      "iOS mu Android mi" tek bakışta. Bilgi yoksa rozet
                      YOK — "bilinmiyor" rozeti satırı kirletirdi. */}
                  {platformEtiketi(t.platform) && (
                    <span
                      className="badge badge-lang"
                      style={{ marginLeft: 6, padding: "3px 7px" }}
                      title={platformEtiketi(t.platform) ?? undefined}
                    >
                      <PlatformIkonu platform={t.platform} />
                    </span>
                  )}
                </span>
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
                    {/* WEB ZİYARETÇİSİ (V68): üye değil, cevap e-postayla
                        gidiyor — yönetici bunu cevap yazmadan bilsin. */}
                    {secili.misafir ? " · Web ziyaretçisi, cevap e-postayla gider" : ""}
                  </div>
                  {/* CİHAZ SATIRI: "iOS · 1.0.74 · iPhone 15 Pro". Alan
                      "talebi açtığı" değil "EN SON yazdığı" cihaz (sunucu
                      her kullanıcı mesajında tazeliyor). */}
                  <div
                    className="muted"
                    style={{
                      fontSize: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    {platformEtiketi(secili.platform) ? (
                      <PlatformIkonu
                        platform={secili.platform}
                        boyut={14}
                        title={platformEtiketi(secili.platform) ?? undefined}
                      />
                    ) : null}
                    <span>{cihazMetni(secili) ?? "Cihaz bilinmiyor"}</span>
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
