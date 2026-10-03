"use client";

import { SITE } from "./ortak";

/**
 * Danışman için başvuru sayfası: haritanın yapısı, adres düzenleri, ayarın
 * ne zaman yansıdığı. Adres düzenleri sitenin kendisiyle aynı (teleskor-web
 * `lib/slug.ts`, `lib/sitemap.ts`, `lib/genelHarita.ts`) — orada değişirse
 * burası da güncellenir. Sayısal varsayılanlar BİLEREK yazılmadı: İnceleme
 * sekmesindeki dosya önizlemesi gerçek değeri gösterir (iki yerde ayrışmasın).
 */
const TURLER: { ad: string; dosya: string; adresler: string[]; not?: string }[] = [
  {
    ad: "Genel sayfalar",
    dosya: "/sitemap-genel.xml",
    adresler: [
      "/ (ana sayfa), /canli-skorlar, /basketbol, /basketbol/canli-skorlar",
      "/maclar/YYYY-AA-GG ve /basketbol/maclar/YYYY-AA-GG (gün sayfaları)",
      "/tv-rehberi (+ gün gün), /puan-durumu, /siralamalar/..., /transferler/...",
      "/haber, /haber/kategori/..., haber arşivi",
      "/iletisim, /uygulama, /site-haritasi ve panelden eklenen ek adresler",
    ],
  },
  {
    ad: "Son haberler",
    dosya: "/haber/sitemap-haber.xml",
    adresler: ["/haber/<haber-adresi>"],
    not: "Yalnız son 48 saatin haberleri (Google Haberler biçimi); daha eskileri (en yeni 200 habere kadar) genel haritada.",
  },
  {
    ad: "Ligler",
    dosya: "/lig/sitemap/N.xml",
    adresler: [
      "/futbol/lig/<ad>-<no> ve /basketbol/lig/<ad>-<no>",
      "…/fikstur, …/oyuncu-istatistikleri, …/piyasa-degerleri (futbol)",
      "/puan-durumu/<ad>-<no> (tablosu varsa)",
    ],
    not: "Yalnız maçı olan ligler; alt sayfalar yalnız içeriği varsa.",
  },
  {
    ad: "Takımlar",
    dosya: "/takim/sitemap/N.xml",
    adresler: ["/futbol/takim/<ad>-<no> ve /basketbol/takim/<ad>-<no>", "…/kadro (oyuncusu varsa), …/fikstur (maçı varsa)"],
  },
  { ad: "Oyuncular", dosya: "/oyuncu/sitemap/N.xml", adresler: ["/oyuncu/<ad>-<no>"] },
  {
    ad: "Maçlar",
    dosya: "/mac/sitemap/futbol-YYYY-AA-GG.xml, /mac/sitemap/basketbol-YYYY-AA-GG.xml",
    adresler: ["/mac/<ev-sahibi>-<konuk>-<no>"],
    not: "Gün gün dosya: geriye 365, ileriye 14 gün; en yakın günler dizinde önce.",
  },
  { ad: "Teknik direktörler", dosya: "/teknik-direktor/sitemap/N.xml", adresler: ["/teknik-direktor/<ad>-<no>"] },
  { ad: "Hakemler", dosya: "/hakem/sitemap/N.xml", adresler: ["/hakem/<ad>-<no>", "/hakem/<ad>-<no>/maclar"] },
];

export default function BilgiKarti() {
  return (
    <div className="stack">
      <div className="card">
        <div className="card-header">
          <div className="card-title">Nasıl çalışır</div>
        </div>
        <div className="card-pad sh-bilgi">
          <p>
            Site haritası elle yazılan bir dosya değil; site her istekte güncel verilerden üretir.
            Giriş adresi <a href={`${SITE}/sitemap.xml`} target="_blank" rel="noreferrer">{SITE}/sitemap.xml</a>{" "}
            bir dizindir ve bütün harita dosyalarını listeler; Search Console&apos;a yalnız bu adres verilir.
            robots.txt de aynı adresi gösterir. Bir dosyada en çok 50.000 adres olabildiği için büyük
            türler (oyuncu, takım…) numaralı dosyalara bölünür.
          </p>
          <p>Bu ekrandaki ayarlar üretimin üstüne uygulanır:</p>
          <ul>
            <li>
              <b>Tür kapatma, öncelik/sıklık, ek adres, hariç kalıp:</b> kaydettikten birkaç saniye
              sonra haritada.
            </li>
            <li>
              <b>robots.txt satırları:</b> birkaç saniye içinde yayında.
            </li>
            <li>
              <b>noindex:</b> en geç bir dakika içinde ilgili sayfaların yanıtında.
            </li>
            <li>
              Arama motorlarının değişikliği görmesi kendi tarama sıklıklarına bağlıdır; Bing ve Yandex
              için &quot;Arama motoruna bildir&quot; sekmesi, Google için Search Console kullanılabilir.
            </li>
            <li>Her değişiklik kimin yaptığıyla birlikte &quot;Değişiklik geçmişi&quot; sekmesinde görünür.</li>
          </ul>
          <p>
            Haritaya hiç girmeyen ve robots.txt ile kapalı tutulan sayfalar: arama, karşılaştırma,
            üyelik (giriş, kayıt, hesap, bildirimler) sayfaları ve soru işaretli (parametreli) adresler.
            Bunlar sitenin sabit kurallarıdır, bu ekrandan açılamaz.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Harita türleri ve adres düzenleri</div>
        </div>
        <div className="card-pad">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tür</th>
                  <th>Dosya</th>
                  <th>Adresler</th>
                </tr>
              </thead>
              <tbody>
                {TURLER.map((t) => (
                  <tr key={t.ad}>
                    <td style={{ whiteSpace: "nowrap" }}>{t.ad}</td>
                    <td className="sh-yol">
                      <code>{t.dosya}</code>
                    </td>
                    <td>
                      {t.adresler.map((a) => (
                        <div key={a} className="sh-yol">
                          {a}
                        </div>
                      ))}
                      {t.not && <div className="cell-sub">{t.not}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
