"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiCeviriListe,
  apiCeviriYaz,
  apiCeviriSozluk,
  apiCeviriSozlukYaz,
  ApiError,
} from "@/lib/api-client";
import type { CeviriSatiri, CeviriSozlukSatiri } from "@/lib/types";

/**
 * ÇEVİRİ DÜZELTME MASASI.
 *
 * <h3>Neden gerekli</h3>
 * Sağlayıcının Türkçe çevirisi tutarsız ("Dünya Şampiyonası Elemeler,Avrupa")
 * ve bazı türleri hiç çevirmiyor (aşama adları, sakatlık sebepleri, puan
 * durumu bölgeleri, teknik direktör ve hakem adları). Ürün Türkiye'ye açık;
 * bu adlar elle düzeltiliyor.
 *
 * <h3>Düzeltme SENKRONLA EZİLMİYOR</h3>
 * Yazılan ad {@code translation_override} tablosuna gidiyor ve senkron oraya
 * ASLA dokunmuyor. Görünen ad şu sırayla seçiliyor:
 * <b>bizim düzeltmemiz → sağlayıcı çevirisi → İngilizce</b>. Bu yüzden
 * tabloda üç sütun ayrı ayrı duruyor: hangisinin kazandığı görünsün.
 *
 * <h3>Kaydetme: Enter</h3>
 * Yüzlerce satır düzeltiliyor; her satır için "kaydet" düğmesine uzanmak
 * işi ikiye katlardı. Kutudan çıkınca da kaydediliyor (blur) — Enter'a
 * basmayı unutan kullanıcı yazdığını kaybetmesin.
 */

const TURLER: [string, string][] = [
  ["TEAM", "Takımlar"],
  ["COMPETITION", "Ligler"],
  ["PLAYER", "Oyuncular"],
  ["COUNTRY", "Ülkeler"],
  ["COACH", "Teknik Direktörler"],
  ["REFEREE", "Hakemler"],
  ["CATEGORY", "Kategoriler"],
  ["BASKET_TEAM", "🏀 Takımlar"],
  ["BASKET_COMPETITION", "🏀 Ligler"],
  ["BASKET_COUNTRY", "🏀 Ülkeler"],
  ["BASKET_CATEGORY", "🏀 Kategoriler"],
];

const SOZLUKLER: [string, string][] = [
  ["stage", "Aşama / Tur adları"],
  ["injury", "Sakatlık sebepleri"],
  ["promotion", "Puan durumu bölgeleri"],
];

const SAYFA = 200;

type Durum = "" | "kaydediliyor" | "ok" | "hata";

export default function TeleskorCeviriClient() {
  // Aktif sekme: tür kodu ya da "sozluk:stage".
  const [aktif, setAktif] = useState("TEAM");
  const [arama, setArama] = useState("");
  const [q, setQ] = useState("");
  const [sadeceEksik, setSadeceEksik] = useState(false);

  const [satirlar, setSatirlar] = useState<CeviriSatiri[]>([]);
  const [toplam, setToplam] = useState(0);
  const [sozlukSatirlari, setSozlukSatirlari] = useState<CeviriSozlukSatiri[]>([]);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [durumlar, setDurumlar] = useState<Record<string, Durum>>({});

  const sozlukMu = aktif.startsWith("sozluk:");
  const sozlukKodu = sozlukMu ? aktif.slice(7) : "";

  // ARAMA BEKLETİCİSİ: her tuşta istek atmak hem sunucuyu hem listeyi
  // yorardı. 350 ms, uygulamadaki arama kutularıyla aynı değer.
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
    zamanlayici.current = setTimeout(() => setQ(arama.trim()), 350);
    return () => {
      if (zamanlayici.current) clearTimeout(zamanlayici.current);
    };
  }, [arama]);

  const yukle = useCallback(
    async (ekle = false) => {
      setLoading(true);
      setHata(null);
      try {
        if (aktif.startsWith("sozluk:")) {
          setSozlukSatirlari(await apiCeviriSozluk(aktif.slice(7)));
          setSatirlar([]);
          setToplam(0);
        } else {
          const offset = ekle ? satirlar.length : 0;
          const s = await apiCeviriListe({
            tur: aktif,
            q,
            sadeceEksik,
            limit: SAYFA,
            offset,
          });
          setSatirlar((eski) => (ekle ? [...eski, ...s.satirlar] : s.satirlar));
          setToplam(s.toplam);
          setSozlukSatirlari([]);
        }
      } catch (e) {
        setHata(e instanceof ApiError ? e.message : "Liste alınamadı.");
      } finally {
        setLoading(false);
      }
    },
    // satirlar.length bilerek DIŞARIDA: bağımlılık olsaydı her yüklemeden
    // sonra yeniden çalışır ve sonsuz döngü olurdu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aktif, q, sadeceEksik],
  );

  useEffect(() => {
    yukle(false);
  }, [yukle]);

  function durumYaz(anahtar: string, d: Durum) {
    setDurumlar((o) => ({ ...o, [anahtar]: d }));
  }

  async function duzeltmeKaydet(s: CeviriSatiri, deger: string) {
    const anahtar = `${aktif}:${s.id}`;
    // DEĞİŞMEDİYSE İSTEK ATMA: blur her odak kaybında tetikleniyor ve
    // kullanıcı yalnız satıra tıklayıp geçtiğinde de çalışırdı.
    if ((s.duzeltme ?? "") === deger.trim()) {
      return;
    }
    durumYaz(anahtar, "kaydediliyor");
    try {
      const y = await apiCeviriYaz(aktif, s.id, deger.trim());
      setSatirlar((eski) =>
        eski.map((x) =>
          x.id === s.id
            ? { ...x, duzeltme: y.duzeltme, gorunen: y.gorunen }
            : x,
        ),
      );
      durumYaz(anahtar, "ok");
    } catch (e) {
      durumYaz(anahtar, "hata");
      setHata(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    }
  }

  async function sozlukKaydet(s: CeviriSozlukSatiri, deger: string) {
    const anahtar = `${aktif}:${s.adEn}`;
    if ((s.adTr ?? "") === deger.trim()) {
      return;
    }
    durumYaz(anahtar, "kaydediliyor");
    try {
      await apiCeviriSozlukYaz(sozlukKodu, s.adEn, deger.trim());
      setSozlukSatirlari((eski) =>
        eski.map((x) =>
          x.adEn === s.adEn ? { ...x, adTr: deger.trim() || null } : x,
        ),
      );
      durumYaz(anahtar, "ok");
    } catch (e) {
      durumYaz(anahtar, "hata");
      setHata(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    }
  }

  const eksikSayisi = sozlukMu
    ? sozlukSatirlari.filter((s) => !s.adTr).length
    : satirlar.filter((s) => !s.duzeltme && !s.saglayici).length;

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Teleskor — Çeviri Düzeltme</h1>
        <div className="muted" style={{ fontSize: 13 }}>
          Yazdığın ad <b>senkronla ezilmez</b>. Görünen ad şu sırayla seçilir:
          senin düzeltmen → sağlayıcının çevirisi → İngilizce.
        </div>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      <div className="card card-pad">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TURLER.map(([kod, ad]) => (
            <button
              key={kod}
              className={`btn btn-sm ${aktif === kod ? "btn-primary" : ""}`}
              onClick={() => setAktif(kod)}
            >
              {ad}
            </button>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid var(--border)",
          }}
        >
          <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>
            Sözlükler:
          </span>
          {SOZLUKLER.map(([kod, ad]) => (
            <button
              key={kod}
              className={`btn btn-sm ${aktif === "sozluk:" + kod ? "btn-primary" : ""}`}
              onClick={() => setAktif("sozluk:" + kod)}
            >
              {ad}
            </button>
          ))}
        </div>
      </div>

      <div className="card card-pad">
        {!sozlukMu && (
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <input
              className="input"
              style={{ maxWidth: 320 }}
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Ara (İngilizce ya da görünen ad)"
            />
            <label
              style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}
            >
              <input
                type="checkbox"
                checked={sadeceEksik}
                onChange={(e) => setSadeceEksik(e.target.checked)}
              />
              Yalnız Türkçesi olmayanlar
            </label>
            <div style={{ flex: 1 }} />
            <span className="muted" style={{ fontSize: 12.5 }}>
              {satirlar.length} / {toplam} kayıt
              {eksikSayisi > 0 && ` · ${eksikSayisi} çevrilmemiş`}
            </span>
          </div>
        )}

        {sozlukMu && (
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>
            Sağlayıcı bu adları <b>hiç çevirmiyor</b> — tek Türkçe kaynağı bu
            sözlük. Listede veride geçen ama sözlükte olmayan adlar da var:
            <b> çevrilmemiş</b> etiketi onları gösteriyor.
            {eksikSayisi > 0 && ` (${eksikSayisi} tane)`}
          </div>
        )}

        {loading && satirlar.length === 0 && sozlukSatirlari.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Yükleniyor…
          </div>
        ) : sozlukMu ? (
          <SozlukTablosu
            satirlar={sozlukSatirlari}
            durumlar={durumlar}
            anahtarOnEki={aktif}
            onKaydet={sozlukKaydet}
          />
        ) : (
          <>
            <AdTablosu
              satirlar={satirlar}
              durumlar={durumlar}
              anahtarOnEki={aktif}
              onKaydet={duzeltmeKaydet}
            />
            {satirlar.length < toplam && (
              <div style={{ marginTop: 12 }}>
                <button
                  className="btn btn-sm"
                  disabled={loading}
                  onClick={() => yukle(true)}
                >
                  {loading ? "Yükleniyor…" : "Daha fazla yükle"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DurumIsareti({ durum }: { durum: Durum }) {
  if (durum === "kaydediliyor") {
    return <span className="muted">…</span>;
  }
  if (durum === "ok") {
    return <span style={{ color: "var(--ok, #16a34a)", fontWeight: 700 }}>✓</span>;
  }
  if (durum === "hata") {
    return <span style={{ color: "var(--danger, #dc2626)", fontWeight: 700 }}>✗</span>;
  }
  return null;
}

function AdTablosu({
  satirlar,
  durumlar,
  anahtarOnEki,
  onKaydet,
}: {
  satirlar: CeviriSatiri[];
  durumlar: Record<string, Durum>;
  anahtarOnEki: string;
  onKaydet: (s: CeviriSatiri, deger: string) => void;
}) {
  if (satirlar.length === 0) {
    return (
      <div className="muted" style={{ fontSize: 13 }}>
        Kayıt yok.
      </div>
    );
  }
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th style={{ width: "26%" }}>İngilizce</th>
          <th style={{ width: "22%" }}>Sağlayıcı çevirisi</th>
          <th style={{ width: "28%" }}>Benim düzeltmem</th>
          <th style={{ width: "20%" }}>Görünen</th>
          <th style={{ width: 30 }} />
        </tr>
      </thead>
      <tbody>
        {satirlar.map((s) => (
          <tr key={s.id}>
            <td>
              {s.ingilizce}
              {!s.saglayici && !s.duzeltme && (
                <span className="badge badge-archived" style={{ marginLeft: 6 }}>
                  çevrilmemiş
                </span>
              )}
            </td>
            <td className="muted">{s.saglayici ?? "—"}</td>
            <td>
              <DuzeltmeKutusu
                baslangic={s.duzeltme ?? ""}
                onKaydet={(deger) => onKaydet(s, deger)}
              />
            </td>
            <td style={{ fontWeight: 600 }}>{s.gorunen ?? "—"}</td>
            <td>
              <DurumIsareti durum={durumlar[`${anahtarOnEki}:${s.id}`] ?? ""} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SozlukTablosu({
  satirlar,
  durumlar,
  anahtarOnEki,
  onKaydet,
}: {
  satirlar: CeviriSozlukSatiri[];
  durumlar: Record<string, Durum>;
  anahtarOnEki: string;
  onKaydet: (s: CeviriSozlukSatiri, deger: string) => void;
}) {
  if (satirlar.length === 0) {
    return (
      <div className="muted" style={{ fontSize: 13 }}>
        Kayıt yok.
      </div>
    );
  }
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th style={{ width: "45%" }}>İngilizce</th>
          <th style={{ width: "45%" }}>Türkçesi</th>
          <th style={{ width: 30 }} />
        </tr>
      </thead>
      <tbody>
        {satirlar.map((s) => (
          <tr key={s.adEn}>
            <td>
              {s.adEn}
              {!s.adTr && (
                <span className="badge badge-archived" style={{ marginLeft: 6 }}>
                  çevrilmemiş
                </span>
              )}
              {/* Veride artık geçmeyen satır: silinebilir ama otomatik
                  silinmiyor — sağlayıcı o adı yarın geri gönderebilir. */}
              {!s.kullaniliyor && (
                <span className="muted" style={{ marginLeft: 6, fontSize: 11.5 }}>
                  · veride geçmiyor
                </span>
              )}
            </td>
            <td>
              <DuzeltmeKutusu
                baslangic={s.adTr ?? ""}
                onKaydet={(deger) => onKaydet(s, deger)}
              />
            </td>
            <td>
              <DurumIsareti durum={durumlar[`${anahtarOnEki}:${s.adEn}`] ?? ""} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Düzenlenebilir hücre.
 *
 * <p>Enter kaydediyor, Esc yazılanı geri alıyor, odak kaybında da
 * kaydediliyor. Üçü birden: yüzlerce satır düzeltilirken kullanıcı bir
 * satırdan diğerine geçerken yazdığını kaybetmemeli, ama yanlışlıkla
 * girdiğinde de kaçış yolu olmalı.
 *
 * <p>Boş bırakmak düzeltmeyi KALDIRIYOR (ad sağlayıcının çevirisine
 * dönüyor) — bu yüzden boş değer de gönderiliyor.
 */
function DuzeltmeKutusu({
  baslangic,
  onKaydet,
}: {
  baslangic: string;
  onKaydet: (deger: string) => void;
}) {
  const [deger, setDeger] = useState(baslangic);

  // ESC BAYRAĞI — ref, state DEĞİL.
  //
  // Esc'te önce setDeger(baslangic) çağırıp blur() demek YETMİYOR: blur
  // olayı aynı işleyicide, React yeniden çizmeden ÖNCE tetikleniyor ve
  // onBlur hâlâ yazılmış değeri görüyor — yani "vazgeç" yazılanı
  // kaydediyordu. Ref anında değişiyor, o yüzden bayrak burada.
  const iptal = useRef(false);

  // Dışarıdan gelen değer değişirse (sayfa yenilendi, sekme değişti)
  // kutu onu takip etmeli.
  useEffect(() => {
    setDeger(baslangic);
  }, [baslangic]);

  return (
    <input
      className="input"
      value={deger}
      placeholder="Türkçesini yaz"
      onChange={(e) => setDeger(e.target.value)}
      onBlur={() => {
        if (iptal.current) {
          iptal.current = false;
          setDeger(baslangic);
          return;
        }
        onKaydet(deger);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          iptal.current = true;
          e.currentTarget.blur();
        }
      }}
    />
  );
}
