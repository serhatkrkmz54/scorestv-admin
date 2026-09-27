"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import RichEditor from "@/components/RichEditor";
import {
  ApiError,
  apiTeleskorHaberGorsel,
  apiTeleskorHaberIndexNow,
  apiTeleskorHaberKaydet,
  apiTeleskorHaberSil,
  apiTeleskorHaberVarlikAra,
} from "@/lib/api-client";
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "@/lib/labels";
import type {
  TeleskorHaberBildirim,
  TeleskorHaberDetayi,
  TeleskorHaberDurum,
  TeleskorHaberVarlik,
  TeleskorVarlikTur,
} from "@/lib/types";

/**
 * TELESKOR HABER FORMU (V69).
 *
 * ScoresTV haber formunun Teleskor karşılığı; aynı alanlar ve aynı editör
 * (RichEditor). Farkları: görseller Teleskor deposuna gider, bağlantı
 * araması motordan yapılır (kimlikler motorun, uygulamanın takım sayfasıyla
 * aynı), dil seçimi yok (yalnız Türkçe), yazar her haberde "TELE SKOR".
 */

const DURUMLAR: { deger: TeleskorHaberDurum; ad: string }[] = [
  { deger: "TASLAK", ad: "Taslak" },
  { deger: "YAYINDA", ad: "Yayında" },
  { deger: "ZAMANLI", ad: "Zamanlanmış" },
  { deger: "ARSIV", ad: "Arşiv (yayından kaldırıldı)" },
];

const TUR_ADI: Record<TeleskorVarlikTur, string> = { TAKIM: "Takım", LIG: "Lig", OYUNCU: "Oyuncu" };

/** ISO → datetime-local (yerel saat). */
function yerelSaat(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Anahtar({
  ad,
  aciklama,
  deger,
  degisti,
}: {
  ad: string;
  aciklama?: string;
  deger: boolean;
  degisti: (v: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      <div>
        <div className="t-label">{ad}</div>
        {aciklama && <div className="t-hint">{aciklama}</div>}
      </div>
      <label className="switch">
        <input type="checkbox" checked={deger} onChange={(e) => degisti(e.target.checked)} />
        <span className="slider" />
      </label>
    </div>
  );
}

function BaglantiSecici({
  deger,
  degisti,
  spor,
}: {
  deger: TeleskorHaberVarlik[];
  degisti: (v: TeleskorHaberVarlik[]) => void;
  spor: string | null;
}) {
  const [tur, setTur] = useState<TeleskorVarlikTur>("TAKIM");
  const [q, setQ] = useState("");
  const [sonuclar, setSonuclar] = useState<TeleskorHaberVarlik[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const sira = useRef(0);

  useEffect(() => {
    const metin = q.trim();
    if (metin.length < 2) {
      setSonuclar([]);
      return;
    }
    const benim = ++sira.current;
    const t = setTimeout(async () => {
      try {
        const s = await apiTeleskorHaberVarlikAra(tur, metin, spor);
        if (benim === sira.current) {
          setSonuclar(s);
          setHata(null);
        }
      } catch (e) {
        if (benim === sira.current) setHata(e instanceof ApiError ? e.message : "Arama yapılamadı.");
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, tur, spor]);

  const ekle = (v: TeleskorHaberVarlik) => {
    if (!deger.some((x) => x.tur === v.tur && x.id === v.id)) degisti([...deger, v]);
    setQ("");
    setSonuclar([]);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <select className="select" style={{ maxWidth: 130 }} value={tur}
          onChange={(e) => setTur(e.target.value as TeleskorVarlikTur)}>
          <option value="TAKIM">Takım</option>
          <option value="LIG">Lig</option>
          <option value="OYUNCU">Oyuncu</option>
        </select>
        {/* ScoresTV formunun bağlantı seçicisiyle aynı sınıflar (linker/chip):
            açık zeminde okunur; nav-item koyu kenar çubuğunun beyaz yazısıydı. */}
        <div className="linker" style={{ flex: 1 }}>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={`${TUR_ADI[tur]} ara (en az 2 harf)`} />
          {q.trim().length >= 2 && (sonuclar.length > 0 || hata) && (
            <div className="linker-results">
              <div className="linker-group-title">{TUR_ADI[tur]}</div>
              {hata && <div className="linker-opt muted">{hata}</div>}
              {sonuclar.map((s) => (
                <div key={`${s.tur}-${s.id}`} className="linker-opt" role="button" tabIndex={0}
                  onClick={() => ekle(s)}
                  onKeyDown={(e) => { if (e.key === "Enter") ekle(s); }}>
                  {s.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="linker-logo" src={s.logo} alt="" />
                  ) : (
                    <span className="linker-logo" />
                  )}
                  <span>{s.ad ?? `#${s.id}`}</span>
                  {s.alt && <span className="muted">— {s.alt}</span>}
                  <span className="muted" style={{ marginLeft: "auto", fontSize: 11 }}>#{s.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {deger.length === 0 ? (
        <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>Bağlantı yok.</div>
      ) : (
        <div className="chips">
          {deger.map((v) => (
            <span key={`${v.tur}-${v.id}`} className="chip">
              {v.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.logo} alt="" />
              ) : null}
              <span className="kind">{TUR_ADI[v.tur]}</span>
              <span>{v.ad ?? `#${v.id}`}</span>
              <button type="button" className="chip-x" aria-label="Kaldır"
                onClick={() => degisti(deger.filter((x) => !(x.tur === v.tur && x.id === v.id)))}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeleskorHaberFormu({ ilk }: { ilk: TeleskorHaberDetayi | null }) {
  const router = useRouter();
  const [baslik, setBaslik] = useState(ilk?.baslik ?? "");
  const [ozet, setOzet] = useState(ilk?.ozet ?? "");
  const [govde, setGovde] = useState(ilk?.govde ?? "");
  const [kapakAnahtar, setKapakAnahtar] = useState<string | null>(ilk?.kapakAnahtar ?? null);
  const [kapakAdres, setKapakAdres] = useState<string | null>(ilk?.kapakAdres ?? null);
  const [kapakYukleniyor, setKapakYukleniyor] = useState<number | null>(null);
  const [durum, setDurum] = useState<TeleskorHaberDurum>(ilk?.durum ?? "TASLAK");
  const [yayinYerel, setYayinYerel] = useState(yerelSaat(ilk?.yayinAni ?? null));
  const [kategori, setKategori] = useState(ilk?.kategori ?? "GENERAL");
  const [spor, setSpor] = useState<"FOOTBALL" | "BASKETBALL" | "">(ilk?.spor ?? "FOOTBALL");
  const [sonDakika, setSonDakika] = useState(ilk?.sonDakika ?? false);
  const [oneCikan, setOneCikan] = useState(ilk?.oneCikan ?? false);
  const [slider, setSlider] = useState(ilk?.slider ?? false);
  const [sliderSira, setSliderSira] = useState(ilk?.sliderSira ?? 0);
  const [kaynak, setKaynak] = useState(ilk?.kaynak ?? "");
  const [kaynakUrl, setKaynakUrl] = useState(ilk?.kaynakUrl ?? "");
  const [bildirim, setBildirim] = useState<TeleskorHaberBildirim>(ilk?.bildirim ?? "YOK");
  const [varliklar, setVarliklar] = useState<TeleskorHaberVarlik[]>(ilk?.varliklar ?? []);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [tamam, setTamam] = useState<string | null>(null);

  const bildirimGitti = !!ilk?.bildirimAni;
  const yayinlanmis = !!ilk?.ilkYayinAni || !!ilk?.eskiId;

  const kapakYukle = async (dosya: File) => {
    setHata(null);
    setKapakYukleniyor(0);
    try {
      const y = await apiTeleskorHaberGorsel(dosya, (p) => setKapakYukleniyor(p));
      setKapakAnahtar(y.anahtar);
      setKapakAdres(y.url);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Kapak yüklenemedi.");
    } finally {
      setKapakYukleniyor(null);
    }
  };

  const istek = useMemo(
    () => ({
      baslik,
      ozet: ozet.trim() || null,
      govde,
      kapakAnahtar,
      durum,
      yayinAni: yayinYerel ? new Date(yayinYerel).toISOString() : null,
      kategori,
      spor: spor || null,
      sonDakika,
      oneCikan,
      slider,
      sliderSira,
      kaynak: kaynak.trim() || null,
      kaynakUrl: kaynakUrl.trim() || null,
      bildirim,
      varliklar,
    }),
    [baslik, ozet, govde, kapakAnahtar, durum, yayinYerel, kategori, spor, sonDakika, oneCikan,
      slider, sliderSira, kaynak, kaynakUrl, bildirim, varliklar],
  );

  const kaydet = async () => {
    setHata(null);
    setTamam(null);
    if (!baslik.trim()) {
      setHata("Başlık zorunlu.");
      return;
    }
    if (durum === "YAYINDA" && bildirim !== "YOK" && !bildirimGitti) {
      const kime = bildirim === "HERKES" ? "bildirimi açık HERKESE" : "bağlı takım ve ligleri takip edenlere";
      if (!window.confirm(`Haber yayınlanınca ${kime} bildirim gidecek. Geri alınamaz. Devam edilsin mi?`)) return;
    }
    setKaydediliyor(true);
    try {
      const d = await apiTeleskorHaberKaydet(ilk?.id ?? null, istek);
      setTamam(d.durum === "YAYINDA" ? "Kaydedildi ve yayında." : "Kaydedildi.");
      if (!ilk) {
        router.replace(`/teleskor/haber/${d.id}`);
      } else {
        router.refresh();
      }
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally {
      setKaydediliyor(false);
    }
  };

  const sil = async () => {
    if (!ilk) return;
    if (!window.confirm("Haber silinsin mi? Adresi 404 olur.")) return;
    try {
      await apiTeleskorHaberSil(ilk.id);
      router.replace("/teleskor/haber");
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Silinemedi.");
    }
  };

  const indexNow = async () => {
    if (!ilk) return;
    try {
      await apiTeleskorHaberIndexNow(ilk.id);
      setTamam("Adres arama motorlarına bildirildi.");
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Bildirilemedi.");
    }
  };

  return (
    <div className="stack">
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button className="btn" onClick={() => router.push("/teleskor/haber")}>Haberlere dön</button>
        <h1 style={{ margin: 0, fontSize: 20 }}>{ilk ? "Haberi düzenle" : "Yeni haber"}</h1>
        {ilk && <span className="muted" style={{ fontSize: 12 }}>#{ilk.id}</span>}
        {ilk?.eskiKaynak && <span className="badge">ScoresTV'den taşındı</span>}
        {ilk?.durum === "YAYINDA" && (
          <a className="btn btn-sm" href={ilk.adres} target="_blank" rel="noopener noreferrer">Sitede aç</a>
        )}
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}
      {tamam && <div className="alert alert-success">{tamam}</div>}

      <div className="form-grid">
        <div className="stack">
          <div className="card card-pad">
            <div className="field">
              <label className="label">Başlık <span className="req">*</span></label>
              <input className="input" value={baslik} maxLength={255}
                onChange={(e) => setBaslik(e.target.value)} placeholder="Haber başlığı" />
              <div className="hint">
                {yayinlanmis
                  ? `Adres sabit: /haber/${ilk?.slug} (yayınlanmış haberin adresi başlık değişse de korunur).`
                  : "Adres başlıktan üretilir; ilk yayından sonra değişmez."}
              </div>
            </div>
            <div className="field">
              <label className="label">Özet</label>
              <textarea className="textarea" value={ozet} maxLength={600}
                onChange={(e) => setOzet(e.target.value)} placeholder="Kısa özet (liste, önizleme ve bildirim metni)" />
              <div className="hint">{ozet.length}/600</div>
            </div>
            <div className="field">
              <label className="label">İçerik <span className="req">*</span></label>
              <RichEditor value={govde} onChange={setGovde} yukleyici={apiTeleskorHaberGorsel} />
            </div>
          </div>

          <div className="card card-pad">
            <div className="section-title">Bağlantılar</div>
            <div className="section-hint">
              Haber bağlı takımların sayfasındaki Haberler sekmesinde görünür; "İlgili favorilere"
              bildirimi bu takım ve ligleri takip edenlere gider.
            </div>
            <BaglantiSecici deger={varliklar} degisti={setVarliklar} spor={spor || null} />
          </div>

          {ilk && ilk.denetim.length > 0 && (
            <div className="card card-pad">
              <div className="section-title">Geçmiş</div>
              <div className="table-wrap"><table className="data-table" style={{ fontSize: 13 }}>
                <tbody>
                  {ilk.denetim.map((d, i) => (
                    <tr key={i}>
                      <td>{new Date(d.zaman).toLocaleString("tr-TR")}</td>
                      <td>{d.islem}</td>
                      <td className="muted">{d.notu ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card card-pad">
            <div className="section-title">Yayın</div>
            <div className="field">
              <label className="label">Durum</label>
              <select className="select" value={durum} onChange={(e) => setDurum(e.target.value as TeleskorHaberDurum)}>
                {DURUMLAR.map((d) => <option key={d.deger} value={d.deger}>{d.ad}</option>)}
              </select>
            </div>
            {(durum === "ZAMANLI" || durum === "YAYINDA") && (
              <div className="field">
                <label className="label">Yayın zamanı {durum === "ZAMANLI" && <span className="req">*</span>}</label>
                <input type="datetime-local" className="input" value={yayinYerel}
                  onChange={(e) => setYayinYerel(e.target.value)} />
                <div className="hint">
                  {durum === "ZAMANLI" ? "Bu zamanda kendiliğinden yayınlanır." : "Boşsa kaydedildiği an."}
                </div>
              </div>
            )}
          </div>

          <div className="card card-pad">
            <div className="section-title">Kapak görseli</div>
            {kapakAdres ? (
              <img src={kapakAdres} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 8 }} />
            ) : (
              <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Kapak yok.</div>
            )}
            <label className="btn">
              {kapakYukleniyor !== null ? `Yükleniyor %${kapakYukleniyor}` : kapakAdres ? "Değiştir" : "Görsel seç"}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void kapakYukle(f);
                  e.target.value = "";
                }} />
            </label>
            {kapakAdres && (
              <button className="btn btn-sm" style={{ marginLeft: 8 }}
                onClick={() => { setKapakAnahtar(null); setKapakAdres(null); }}>
                Kaldır
              </button>
            )}
            <div className="hint">JPEG, PNG ya da WebP; en fazla 10 MB, 1080 px genişliğe küçültülür.</div>
          </div>

          <div className="card card-pad">
            <div className="section-title">Sınıflandırma</div>
            <div className="field">
              <label className="label">Kategori</label>
              <select className="select" value={kategori} onChange={(e) => setKategori(e.target.value)}>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">Spor</label>
              <select className="select" value={spor}
                onChange={(e) => setSpor(e.target.value as "FOOTBALL" | "BASKETBALL" | "")}>
                <option value="FOOTBALL">Futbol</option>
                <option value="BASKETBALL">Basketbol</option>
                <option value="">Genel (spora bağlı değil)</option>
              </select>
            </div>
          </div>

          <div className="card card-pad">
            <div className="section-title">Etiketler</div>
            <Anahtar ad="Son dakika" deger={sonDakika} degisti={setSonDakika} />
            <Anahtar ad="Öne çıkan" aciklama="Ana sayfa haber şeridi" deger={oneCikan} degisti={setOneCikan} />
            <Anahtar ad="Slider'da göster" aciklama="Haber sayfasının üst slider'ı" deger={slider} degisti={setSlider} />
            {slider && (
              <div className="field" style={{ marginTop: 10 }}>
                <label className="label">Slider sırası</label>
                <input className="input" type="number" value={sliderSira}
                  onChange={(e) => setSliderSira(Number(e.target.value) || 0)} />
                <div className="hint">Küçük numara önce (0, 1, 2…); aynı numarada en yeni önce.</div>
              </div>
            )}
          </div>

          <div className="card card-pad">
            <div className="section-title">Kaynak (isteğe bağlı)</div>
            <div className="field">
              <label className="label">Kaynak adı</label>
              <input className="input" value={kaynak} maxLength={100} onChange={(e) => setKaynak(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Kaynak adresi</label>
              <input className="input" value={kaynakUrl} maxLength={1024}
                onChange={(e) => setKaynakUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="card card-pad">
            <div className="section-title">Bildirim</div>
            {bildirimGitti ? (
              <div className="section-hint">
                Bildirim {new Date(ilk!.bildirimAni!).toLocaleString("tr-TR")} tarihinde gitti; bir daha gönderilmez.
              </div>
            ) : (
              <>
                <div className="section-hint">Haber ilk yayına girdiğinde bir kez gönderilir.</div>
                <div className="radio-row" style={{ flexDirection: "column", gap: 8 }}>
                  {([
                    ["YOK", "Kimseye gönderme (yalnızca yayınla)"],
                    ["FAVORILER", "İlgili favorilere gönder"],
                    ["HERKES", "Herkese gönder"],
                  ] as [TeleskorHaberBildirim, string][]).map(([d, ad]) => (
                    <label key={d} className={`radio-opt ${bildirim === d ? "selected" : ""}`}>
                      <input type="radio" name="bildirim" checked={bildirim === d} onChange={() => setBildirim(d)} />
                      {ad}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="form-actions">
        {ilk && <button className="btn btn-danger" onClick={() => void sil()} disabled={kaydediliyor}>Sil</button>}
        {ilk?.durum === "YAYINDA" && (
          <button className="btn" onClick={() => void indexNow()} disabled={kaydediliyor}>
            Arama motorlarına bildir
          </button>
        )}
        <button className="btn btn-primary" onClick={() => void kaydet()} disabled={kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
