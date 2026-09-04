"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api-client";

/**
 * TEK METİN ALANLI ONAY MODALI — Teleskor işlemleri için ortak.
 *
 * <h3>Neden ortak</h3>
 * Üye ekranında (rol değiştir, hesap kapat, oturumları kapat) ve sipariş
 * ekranında (teslim et, iptal + iade) aynı şey isteniyor: bir uyarı göster,
 * tek bir metin al, işlemi çalıştır, hatayı modalın İÇİNDE göster. İki
 * yerde ayrı yazılsaydı biri düzeltilirken diğeri eskide kalırdı — bu
 * bileşenin doğduğu yer zaten üç zincirli {@code prompt()} çağrısıydı.
 *
 * <h3>Metnin KİME göründüğü çağırana bağlı</h3>
 * Üye işlemlerinde alınan metin <b>gerekçe</b>: yalnız denetim kaydına
 * giriyor. Sipariş işlemlerinde <b>kullanıcıya gösterilen not</b>: kargo
 * takip numarası, kupon kodu, iptal gerekçesi. İkisi aynı kutu ama aynı
 * şey değil, o yüzden etiket ve ipucu parametre — sabit yazılsaydı
 * ekranlardan biri yalan söylerdi.
 */
export default function TeleskorOnayModal({
  baslik,
  uyari,
  alanEtiketi,
  alanIpucu,
  zorunlu = true,
  onayMetni = "Onayla",
  tehlikeli = false,
  secim,
  onKapat,
  onOnayla,
}: {
  baslik: string;
  uyari: string;
  alanEtiketi: string;
  alanIpucu?: string;
  /** Metin boşken onay düğmesi kapalı kalsın mı? */
  zorunlu?: boolean;
  onayMetni?: string;
  /** Geri alınamaz işlem (iptal/iade, hesap kapatma) — düğme kırmızı. */
  tehlikeli?: boolean;
  /**
   * İSTEĞE BAĞLI ikinci alan: metnin yanında bir de seçim gerektiren
   * işlemler için (bugün yalnız susturma süresi).
   *
   * Ayrı bir modal yazmak yerine buraya eklendi çünkü asıl değer bu
   * bileşenin ÇÖZDÜĞÜ şeylerde: hatayı modalın içinde göstermek (metin
   * kaybolmasın), gönderim sırasında düğmeyi kilitlemek, detay modalının
   * üstünde açılmak. İkinci bir kopya yazılsaydı o üç karar zamanla
   * ayrışırdı — ve ilk ayrışan hep hata gösterimi olur.
   */
  secim?: {
    etiket: string;
    varsayilan: string;
    secenekler: { deger: string; etiket: string }[];
  };
  onKapat: () => void;
  onOnayla: (deger: string, secim: string) => Promise<void>;
}) {
  const [deger, setDeger] = useState("");
  const [secilen, setSecilen] = useState(secim?.varsayilan ?? "");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const gecerli = !zorunlu || deger.trim().length > 0;

  async function gonder() {
    if (!gecerli) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      await onOnayla(deger.trim(), secilen);
    } catch (e) {
      // HATA MODALIN İÇİNDE: modal kapanıp arkadaki sayfada gösterilseydi
      // kullanıcı yazdığı metni kaybeder ve baştan yazardı.
      setHata(e instanceof ApiError ? e.message : "İşlem tamamlanamadı.");
      setGonderiliyor(false);
    }
  }

  return (
    // zIndex 110: bu modal DETAY modalının (100) üstünde açılıyor.
    <div className="modal-overlay" style={{ zIndex: 110 }} onClick={onKapat}>
      <div
        className="modal"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="card-title" style={{ margin: 0 }}>
            {baslik}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onKapat}>
            Kapat
          </button>
        </div>
        <div className="card-pad">
          <div style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 12 }}>
            {uyari}
          </div>

          {hata && <div className="alert alert-error">{hata}</div>}

          {secim && (
            <div className="field">
              <label className="label">{secim.etiket}</label>
              <select
                className="select"
                value={secilen}
                onChange={(e) => setSecilen(e.target.value)}
              >
                {secim.secenekler.map((s) => (
                  <option key={s.deger} value={s.deger}>
                    {s.etiket}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <label className="label">{alanEtiketi}</label>
            <input
              className="input"
              maxLength={300}
              autoFocus
              value={deger}
              onChange={(e) => setDeger(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") gonder();
              }}
              placeholder={alanIpucu}
            />
          </div>

          <div className="form-actions">
            <button
              className={`btn ${tehlikeli ? "btn-danger" : "btn-primary"}`}
              disabled={!gecerli || gonderiliyor}
              onClick={gonder}
            >
              {gonderiliyor ? "Uygulanıyor…" : onayMetni}
            </button>
            <button className="btn btn-ghost" onClick={onKapat}>
              Vazgeç
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
