"use client";

import { useState } from "react";
import { Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { ApiError, apiTeleskorSifreBelirle } from "@/lib/api-client";

/** Karışmayan karakterler (0/O, 1/l/I yok): kullanıcıya sözle de iletilebilsin. */
const HARF = "abcdefghjkmnpqrstuvwxyz";
const BUYUK = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const RAKAM = "23456789";
const ISARET = "#@!%*+=?";

function rastgele(k: string): string {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return k[a[0] % k.length];
}

/** 16 karakter, dört türden en az biri; tarayıcının güvenli rastgele kaynağı. */
function sifreUret(): string {
  const hepsi = HARF + BUYUK + RAKAM + ISARET;
  const parca = [rastgele(HARF), rastgele(BUYUK), rastgele(RAKAM), rastgele(ISARET)];
  while (parca.length < 16) parca.push(rastgele(hepsi));
  for (let i = parca.length - 1; i > 0; i--) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    const j = a[0] % (i + 1);
    [parca[i], parca[j]] = [parca[j], parca[i]];
  }
  return parca.join("");
}

/**
 * ŞİFREYİ YÖNETİCİ BELİRLER (Üyeler → kart → Şifre). Şifre yalnız Teleskor'a
 * gider: denetim kaydına, log'a ve e-postaya yazılmaz; kullanıcıya yalnız
 * "şifre tanımlandı" bilgisi gider. Şifreyi kullanıcıya siz iletirsiniz.
 * Oturumlar: şifresi olan hesapta varsayılan kapat (değiştirme), şifresiz
 * hesapta (Google/Apple) varsayılan açık bırak (ekleme).
 */
export default function TeleskorSifreModal({
  kullaniciId,
  kullaniciAdi,
  sifresiVar,
  onKapat,
  onTamam,
}: {
  kullaniciId: number;
  kullaniciAdi: string;
  sifresiVar: boolean;
  onKapat: () => void;
  onTamam: (mesaj: string) => void;
}) {
  const [sifre, setSifre] = useState("");
  const [tekrar, setTekrar] = useState("");
  const [goster, setGoster] = useState(false);
  const [kapat, setKapat] = useState(sifresiVar);
  const [gerekce, setGerekce] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);

  const uyusmuyor = tekrar.length > 0 && sifre !== tekrar;
  const kisa = sifre.length > 0 && sifre.length < 8;
  const gecerli = sifre.length >= 8 && sifre === tekrar && gerekce.trim().length >= 5 && !mesgul;

  function uret() {
    const s = sifreUret();
    setSifre(s);
    setTekrar(s);
    setGoster(true);
    setKopyalandi(false);
  }

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(sifre);
      setKopyalandi(true);
    } catch {
      setHata("Panoya kopyalanamadı; şifreyi elle seçip kopyalayın.");
    }
  }

  async function gonder() {
    if (!gecerli) return;
    setMesgul(true);
    setHata(null);
    try {
      const y = await apiTeleskorSifreBelirle(kullaniciId, sifre, kapat, gerekce.trim());
      onTamam(
        `${kullaniciAdi} için şifre ${sifresiVar ? "değiştirildi" : "tanımlandı"}` +
          (y.oturumlarKapandi ? "; açık oturumları kapatıldı." : "; açık oturumları sürüyor.") +
          " Kullanıcıya bilgi e-postası gitti (şifre e-postada yok); şifreyi ona siz iletin.",
      );
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Şifre belirlenemedi.");
      setMesgul(false);
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 110 }} onClick={onKapat}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="card-title" style={{ margin: 0 }}>
            {sifresiVar ? "Şifreyi değiştir" : "Şifre tanımla"}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onKapat}>
            Kapat
          </button>
        </div>
        <div className="card-pad">
          <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
            {sifresiVar
              ? `${kullaniciAdi} hesabının şifresi değişecek.`
              : `${kullaniciAdi} şu an yalnız Google/Apple ile giriyor; bu şifreyle e-posta ya da kullanıcı adıyla da girebilecek (sosyal giriş sürer).`}{" "}
            Şifre hiçbir yere kaydedilmez ve e-postayla gönderilmez: kullanıcıya yalnız &quot;şifre
            tanımlandı&quot; bilgisi gider, şifreyi ona <b>siz güvenli bir yoldan</b>{" "}iletirsiniz. Mümkünse bunun
            yerine &quot;bağlantı gönder&quot;i kullanın: şifreyi kullanıcı kendisi belirler.
          </div>

          {hata && <div className="alert alert-error">{hata}</div>}

          <div className="field">
            <label className="label">Yeni şifre</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                className="input"
                type={goster ? "text" : "password"}
                autoComplete="new-password"
                value={sifre}
                maxLength={72}
                onChange={(e) => {
                  setSifre(e.target.value);
                  setKopyalandi(false);
                }}
              />
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                title={goster ? "Gizle" : "Göster"}
                aria-label={goster ? "Gizle" : "Göster"}
                onClick={() => setGoster((g) => !g)}
              >
                {goster ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {kisa && <div className="field-error">En az 8 karakter.</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-sm" onClick={uret}>
                <RefreshCw size={14} /> Güçlü şifre üret
              </button>
              <button type="button" className="btn btn-sm" disabled={!sifre} onClick={() => void kopyala()}>
                <Copy size={14} /> {kopyalandi ? "Kopyalandı" : "Kopyala"}
              </button>
            </div>
          </div>
          <div className="field">
            <label className="label">Şifre tekrar</label>
            <input
              className="input"
              type={goster ? "text" : "password"}
              autoComplete="new-password"
              value={tekrar}
              maxLength={72}
              onChange={(e) => setTekrar(e.target.value)}
            />
            {uyusmuyor && <div className="field-error">İki şifre aynı değil.</div>}
          </div>
          <label className="check-row" style={{ marginBottom: 12, fontSize: 13 }}>
            <input type="checkbox" checked={kapat} onChange={(e) => setKapat(e.target.checked)} />
            <span>
              Açık oturumlarını kapat (bütün cihazlardan çıkış)
              {!sifresiVar && <span className="muted"> — şifresiz hesapta genelde gerekmez</span>}
            </span>
          </label>
          <div className="field">
            <label className="label">Gerekçe (zorunlu)</label>
            <input
              className="input"
              value={gerekce}
              maxLength={300}
              placeholder="Denetim kaydına yazılır (şifre yazılmaz)"
              onChange={(e) => setGerekce(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void gonder();
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={onKapat}>
              Vazgeç
            </button>
            <button className="btn btn-primary" disabled={!gecerli} onClick={() => void gonder()}>
              {mesgul ? "Kaydediliyor…" : sifresiVar ? "Şifreyi değiştir" : "Şifreyi tanımla"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
