"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { apiSiteHaritasiRobotsEkle, apiSiteHaritasiRobotsSil, apiSiteHaritasiRobotsTxt } from "@/lib/api-client";
import { robotsIzni } from "@/lib/robots-kurali";
import type { SiteHaritasiAyarlari } from "@/lib/types";
import { SITE, hataMetni, tarih, yolaCevir } from "./ortak";

/** Sunucuyla aynı biçim kuralı (Teleskor `robotsYolu`): "/" ile başlar, boşluksuz, "$" yalnız sonda. */
function robotsYolHatasi(y: string): string | null {
  if (!y) return null;
  if (!y.startsWith("/")) return "Yol \"/\" ile başlamalı (örnek: /ara). Alan adı yazılmaz.";
  if (/\s/.test(y) || /[^\x21-\x7E]/.test(y)) return "Boşluk ve Türkçe karakter olamaz.";
  if (y.includes("$") && y.indexOf("$") !== y.length - 1) return "\"$\" yalnız yolun sonunda kullanılır.";
  if (y.includes("#")) return "\"#\" kullanılamaz.";
  return null;
}

/**
 * robots.txt EKLERİ (V73). Sitenin sabit kuralları kodda; buradan eklenenler
 * onların ardına yazılır. Siteyi, haritayı ya da stil dosyalarını kapatacak
 * Disallow'u Teleskor reddeder. Canlı dosya ve "bu adres taranabilir mi"
 * denemesi aynı ekranda.
 */
export default function RobotsKarti({
  veri,
  yenile,
  bildir,
}: {
  veri: SiteHaritasiAyarlari;
  yenile: () => Promise<void>;
  bildir: (m: string) => void;
}) {
  const [canli, setCanli] = useState<string | null>(null);
  const [canliHata, setCanliHata] = useState<string | null>(null);
  const [kural, setKural] = useState<"DISALLOW" | "ALLOW">("DISALLOW");
  const [yol, setYol] = useState("");
  const [not, setNot] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [deneme, setDeneme] = useState("");

  const canliOku = useCallback(async () => {
    setCanliHata(null);
    try {
      setCanli((await apiSiteHaritasiRobotsTxt()).metin);
    } catch (e) {
      setCanliHata(hataMetni(e, "robots.txt okunamadı."));
    }
  }, []);

  useEffect(() => {
    void canliOku();
  }, [canliOku]);

  const temiz = yol.trim();
  const yerelHata = robotsYolHatasi(temiz);

  /** Deneme: canlı dosya + (yazılmaktaysa) eklenecek kural, Google'ın kuralıyla. */
  const denemeSonucu = useMemo(() => {
    if (!deneme.trim() || canli == null) return null;
    const y = yolaCevir(deneme);
    if (y == null) return { hata: "Sitenin kendi adresi ya da \"/\" ile başlayan yol yazın." };
    const metin =
      temiz && !yerelHata
        ? canli.replace(/(User-Agent:\s*\*[^\n]*\n)/i, `$1${kural === "ALLOW" ? "Allow" : "Disallow"}: ${temiz}\n`)
        : canli;
    const once = robotsIzni(canli, y);
    const sonra = robotsIzni(metin, y);
    return { yol: y, once, sonra, degisir: metin !== canli && once.izinli !== sonra.izinli };
  }, [deneme, canli, temiz, yerelHata, kural]);

  async function ekle() {
    if (!temiz || yerelHata) return;
    setMesgul(true);
    setHata(null);
    try {
      await apiSiteHaritasiRobotsEkle({ kural, yol: temiz, not: not.trim() });
      setYol("");
      setNot("");
      await yenile();
      await canliOku();
      bildir(`robots.txt: ${kural === "ALLOW" ? "Allow" : "Disallow"} ${temiz} eklendi.`);
    } catch (e) {
      setHata(hataMetni(e, "Eklenemedi."));
    } finally {
      setMesgul(false);
    }
  }

  async function sil(id: number, ad: string) {
    if (!window.confirm(`robots.txt'den "${ad}" satırı kaldırılsın mı?`)) return;
    setHata(null);
    try {
      await apiSiteHaritasiRobotsSil(id);
      await yenile();
      await canliOku();
      bildir(`robots.txt: ${ad} kaldırıldı.`);
    } catch (e) {
      setHata(hataMetni(e, "Kaldırılamadı."));
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="card-header">
          <div className="card-title">robots.txt ek kuralları ({veri.robots.length})</div>
        </div>
        <div className="card-pad">
          <div className="hint" style={{ marginBottom: 12 }}>
            Buradan eklenen satırlar sitenin sabit kurallarının ardına yazılır ve birkaç saniyede
            yayına girer. Disallow bir sayfanın taranmasını engeller ama dizinden çıkarmaz;
            dizinden çıkarmak için Harita kuralları sekmesinde hariç kalıp + noindex kullanın (taranması
            engellenen sayfanın noindex işaretini arama motoru göremez). <code>*</code> herhangi bir
            şey, sondaki <code>$</code> adresin bittiği yer demek (<code>/*.pdf$</code>). Ana sayfayı,
            robots.txt&apos;yi, site haritası dosyalarını ya da sayfaların stil dosyalarını kapatan
            Disallow kabul edilmez.
          </div>
          <div className="sh-form sh-form-robots">
            <div className="field" style={{ margin: 0 }}>
              <label className="label">Kural</label>
              <select
                className="select"
                value={kural}
                onChange={(e) => setKural(e.target.value as "DISALLOW" | "ALLOW")}
              >
                <option value="DISALLOW">Disallow (taranmasın)</option>
                <option value="ALLOW">Allow (taransın)</option>
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="label">Yol</label>
              <input
                className="input"
                value={yol}
                placeholder="/ornek-yol ya da /*.pdf$"
                maxLength={500}
                onChange={(e) => setYol(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void ekle();
                }}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="label">Not (isteğe bağlı)</label>
              <input
                className="input"
                value={not}
                maxLength={300}
                placeholder="Neden eklendi"
                onChange={(e) => setNot(e.target.value)}
              />
            </div>
            <div className="sh-form-dugme">
              <button className="btn btn-primary" disabled={mesgul || !temiz || !!yerelHata} onClick={() => void ekle()}>
                {mesgul ? "Ekleniyor…" : "Ekle"}
              </button>
            </div>
          </div>
          {yerelHata && (
            <div className="field-error" style={{ marginTop: 6 }}>
              {yerelHata}
            </div>
          )}
          {hata && (
            <div className="alert alert-error" style={{ marginTop: 10 }}>
              {hata}
            </div>
          )}

          <div className="sh-deneme">
            <div className="field" style={{ margin: 0 }}>
              <label className="label">Tarama denemesi</label>
              <input
                className="input"
                value={deneme}
                placeholder="Bir adres yazın: arama motoru bu sayfayı tarayabilir mi?"
                onChange={(e) => setDeneme(e.target.value)}
              />
            </div>
            {denemeSonucu?.hata && (
              <div className="field-error" style={{ marginTop: 6 }}>
                {denemeSonucu.hata}
              </div>
            )}
            {denemeSonucu?.sonra && (
              <div
                className={`alert ${denemeSonucu.sonra.izinli ? "alert-success" : "alert-warning"}`}
                style={{ marginTop: 8, marginBottom: 0 }}
              >
                <b>{denemeSonucu.yol}</b>{" "}
                {denemeSonucu.sonra.izinli ? "taranabilir" : "taranmaz"}
                {denemeSonucu.sonra.kural ? ` (belirleyen satır: ${denemeSonucu.sonra.kural})` : " (hiçbir satır uymuyor)"}
                {denemeSonucu.degisir && (
                  <>
                    {" "}
                    — yazdığınız kural eklenirse durum değişir (şu an{" "}
                    {denemeSonucu.once?.izinli ? "taranabilir" : "taranmaz"}).
                  </>
                )}
              </div>
            )}
          </div>

          {veri.robots.length === 0 ? (
            <div className="muted" style={{ fontSize: 13, marginTop: 14 }}>
              Panelden eklenmiş satır yok; yalnız sitenin sabit kuralları geçerli.
            </div>
          ) : (
            <div className="table-wrap" style={{ marginTop: 14 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kural</th>
                    <th>Yol</th>
                    <th>Not</th>
                    <th>Ekleyen</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {veri.robots.map((k) => (
                    <tr key={k.id}>
                      <td>
                        <span className={`badge ${k.kural === "DISALLOW" ? "badge-archived" : "badge-published"}`}>
                          {k.kural === "DISALLOW" ? "Disallow" : "Allow"}
                        </span>
                      </td>
                      <td className="sh-yol">
                        <code>{k.yol}</code>
                      </td>
                      <td>{k.not || <span className="muted">—</span>}</td>
                      <td className="cell-sub">
                        {k.ekleyen ?? "—"}
                        <br />
                        {tarih(k.eklendi)}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-ghost"
                          title="Kaldır"
                          aria-label="Kaldır"
                          onClick={() => void sil(k.id, `${k.kural === "DISALLOW" ? "Disallow" : "Allow"}: ${k.yol}`)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Yayındaki robots.txt</div>
          <a href={`${SITE}/robots.txt`} target="_blank" rel="noreferrer" className="btn btn-sm">
            <ExternalLink size={14} /> Sitede aç
          </a>
        </div>
        <div className="card-pad">
          {canliHata && <div className="alert alert-error">{canliHata}</div>}
          {canli == null && !canliHata && <div className="muted">Yükleniyor…</div>}
          {canli != null && <pre className="sh-pre">{canli}</pre>}
        </div>
      </div>
    </div>
  );
}
