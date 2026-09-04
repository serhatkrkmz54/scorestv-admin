"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiTeleskorDuyurular,
  apiTeleskorDuyuruOnizleme,
  apiTeleskorDuyuruGonder,
  ApiError,
} from "@/lib/api-client";
import type { DuyuruKaydi, DuyuruOnizleme, DuyuruTuru } from "@/lib/types";
import { formatDate } from "@/lib/format";

/**
 * DUYURULAR — yöneticinin kullanıcılara ulaşabildiği tek kanal.
 *
 * <h3>Panelin en yıkıcı düğmesi</h3>
 * Diğer yönetim işlemleri tek bir kaydı değiştiriyor ve geri alınabiliyor;
 * bu düğme telefonlarda bildirim çıkarıyor ve <b>geri alınamıyor</b>. Ekran
 * buna göre kurulu: gönderilen metin aynen önizleniyor, kime gideceği
 * yazıyor, gönderim onay penceresinden geçiyor ve geçmiş hemen altta —
 * "bunu zaten göndermiş miydim" sorusunun tek koruması o liste.
 *
 * <h3>HEDEF KİTLE SEÇİLEMİYOR</h3>
 * Ekranda "kime gönderilsin" kutusu YOK ve bu bilinçli: kitleyi TÜR
 * belirliyor. Ticari ileti yalnız açık rıza verenlere gidiyor (6563) ve
 * seçilebilir olsaydı "kampanyayı herkese gönder" tek tık olurdu — kanunun
 * koruduğu şey bir arayüz tercihine bırakılmış olurdu.
 */
export default function TeleskorDuyuruClient() {
  const [kayitlar, setKayitlar] = useState<DuyuruKaydi[]>([]);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const [tur, setTur] = useState<DuyuruTuru>("DUYURU");
  const [baslik, setBaslik] = useState("");
  const [metin, setMetin] = useState("");
  const [hedefYol, setHedefYol] = useState("");
  const [onizleme, setOnizleme] = useState<DuyuruOnizleme | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [onay, setOnay] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setKayitlar(await apiTeleskorDuyurular());
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Duyurular alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ÖNİZLEME TÜR DEĞİŞİNCE TAZELENİYOR: "kaç kişiye gider" sorusunun
  // cevabı türe bağlı ve yönetici gönderirken bunu görmüş olmalı.
  useEffect(() => {
    let iptal = false;
    apiTeleskorDuyuruOnizleme(tur)
      .then((o) => {
        if (!iptal) setOnizleme(o);
      })
      .catch(() => {
        if (!iptal) setOnizleme(null);
      });
    return () => {
      iptal = true;
    };
  }, [tur]);

  async function gonder() {
    setGonderiliyor(true);
    setHata(null);
    try {
      await apiTeleskorDuyuruGonder({
        tur,
        baslik: baslik.trim(),
        metin: metin.trim(),
        hedefYol: hedefYol.trim() || undefined,
      });
      setBaslik("");
      setMetin("");
      setHedefYol("");
      setOnay(false);
      // GÖNDERİM ARKA PLANDA SÜRÜYOR (sunucu 202 döndü). Liste hemen
      // tazeleniyor ki kayıt "GONDERILIYOR" olarak görünsün; sonucu
      // görmek için yönetici Yenile'ye basıyor.
      await load();
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Duyuru gönderilemedi.");
    } finally {
      setGonderiliyor(false);
    }
  }

  const dolu = baslik.trim().length > 0 && metin.trim().length > 0;
  const kapali = onizleme?.fcmHazir === false;

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Teleskor — Duyurular</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Gönderilen bildirim <b>geri alınamaz</b>. Göndermeden önce metni
            ve kime gideceğini kontrol et.
          </div>
        </div>
        <button className="btn" disabled={loading} onClick={load}>
          {loading ? "Yükleniyor…" : "Yenile"}
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      {kapali && (
        <div className="alert alert-error">
          <b>Bildirim servisi kapalı.</b> Sunucuda <code>PUSH_ENABLED</code>{" "}
          açık değil ya da Firebase hizmet hesabı anahtarı okunamıyor. Bu
          durumda duyuru gönderilemez — sunucu isteği reddediyor.
        </div>
      )}

      {/* YENİ DUYURU */}
      <div className="card card-pad">
        <div className="card-title">Yeni duyuru</div>

        <div className="field" style={{ maxWidth: 420 }}>
          <label className="label">Tür</label>
          <select
            className="select"
            value={tur}
            onChange={(e) => {
              setTur(e.target.value as DuyuruTuru);
              // Tür değişince onay sıfırlanıyor: kullanıcı "herkese"
              // diye onayladığı bir metni farkında olmadan ticari
              // iletiye çevirmesin.
              setOnay(false);
            }}
          >
            <option value="DUYURU">Hizmet duyurusu (bakım, arıza, yenilik)</option>
            <option value="KAMPANYA">Ticari ileti / kampanya</option>
          </select>
        </div>

        {onizleme && (
          <div
            className={onizleme.ticari ? "alert alert-error" : "alert"}
            style={{ fontSize: 12.5, marginTop: 4 }}
          >
            <b>
              Kime gidiyor:{" "}
              {onizleme.kitle == null
                ? "bilinmiyor"
                : `${onizleme.kitle} cihaz`}
            </b>
            <div style={{ marginTop: 4 }}>{onizleme.aciklama}</div>
            {onizleme.ticari && (
              <div style={{ marginTop: 6 }}>
                Hedef kitle <b>seçilemez</b>: ticari ileti yalnız açık rıza
                verenlere gider. Hizmete ilişkin bilgilendirme (bakım, arıza,
                sürüm) ticari ileti değildir — onu <i>Hizmet duyurusu</i>{" "}
                olarak gönder, herkese ulaşsın.
              </div>
            )}
          </div>
        )}

        <div className="field">
          <label className="label">Başlık</label>
          <input
            className="input"
            maxLength={120}
            placeholder="Bildirimin başlığı"
            value={baslik}
            onChange={(e) => {
              setBaslik(e.target.value);
              setOnay(false);
            }}
          />
        </div>

        <div className="field">
          <label className="label">Metin</label>
          <textarea
            className="input"
            rows={3}
            maxLength={500}
            placeholder="Bildirimde görünecek metin"
            value={metin}
            onChange={(e) => {
              setMetin(e.target.value);
              setOnay(false);
            }}
          />
          <div className="muted" style={{ fontSize: 11.5 }}>
            {metin.length}/500
          </div>
        </div>

        <div className="field" style={{ maxWidth: 420 }}>
          <label className="label">Açılacak yer (isteğe bağlı)</label>
          <input
            className="input"
            maxLength={200}
            placeholder="örn. market"
            value={hedefYol}
            onChange={(e) => setHedefYol(e.target.value)}
          />
          <div className="muted" style={{ fontSize: 11.5 }}>
            Bildirime dokununca uygulamada açılacak yer. Boş bırakılırsa ana
            ekran açılır.
          </div>
        </div>

        {/* TELEFONDA NASIL GÖRÜNECEK. Gönderilen şey bir metin değil, bir
            bildirim; yönetici onu bildirim gibi görmeden onaylamamalı. */}
        {dolu && (
          <div style={{ marginTop: 6, marginBottom: 10 }}>
            <div className="muted" style={{ fontSize: 11.5, marginBottom: 4 }}>
              Telefonda böyle görünecek:
            </div>
            <div
              className="card card-pad"
              style={{ maxWidth: 360, padding: "10px 12px" }}
            >
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                {baslik.trim()}
              </div>
              <div style={{ fontSize: 12.5, marginTop: 2 }}>{metin.trim()}</div>
            </div>
          </div>
        )}

        {/* İKİ ADIMLI ONAY. Tek düğme olsaydı yanlış tıklama geri
            alınamayan bir gönderime dönüşürdü; kutu işaretlenmeden
            düğme çalışmıyor ve metin her değiştiğinde işaret siliniyor. */}
        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            fontSize: 12.5,
            marginTop: 4,
          }}
        >
          <input
            type="checkbox"
            checked={onay}
            disabled={!dolu || kapali}
            onChange={(e) => setOnay(e.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span>
            Metni okudum. Bu bildirimin{" "}
            {onizleme?.kitle == null
              ? "uygulamayı kurmuş herkese"
              : `${onizleme.kitle} cihaza`}{" "}
            gideceğini ve <b>geri alınamayacağını</b> biliyorum.
          </span>
        </label>

        <div style={{ marginTop: 10 }}>
          <button
            className="btn btn-primary"
            disabled={!dolu || !onay || gonderiliyor || kapali}
            onClick={gonder}
          >
            {gonderiliyor ? "Gönderiliyor…" : "Gönder"}
          </button>
        </div>
      </div>

      {/* GEÇMİŞ */}
      <div className="card card-pad">
        <div className="card-title">Gönderilenler</div>
        {kayitlar.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>
            {loading ? "Yükleniyor…" : "Henüz duyuru gönderilmedi."}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 150 }}>Tarih</th>
                <th style={{ width: 110 }}>Tür</th>
                <th>Başlık</th>
                <th style={{ width: 120 }}>Durum</th>
                <th style={{ textAlign: "right", width: 90 }}>Hedef</th>
                <th style={{ textAlign: "right", width: 80 }}>Ulaşan</th>
              </tr>
            </thead>
            <tbody>
              {kayitlar.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontSize: 12 }}>{formatDate(d.an)}</td>
                  <td>
                    <span
                      className={`badge ${
                        d.tur === "KAMPANYA" ? "badge-scheduled" : "badge-lang"
                      }`}
                    >
                      {d.tur === "KAMPANYA" ? "Ticari" : "Hizmet"}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {d.baslik}
                    </div>
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      {d.metin}
                    </div>
                    {d.hata && (
                      <div
                        style={{ fontSize: 11.5, color: "var(--danger, #dc2626)" }}
                      >
                        {d.hata}
                      </div>
                    )}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        d.durum === "TAMAM"
                          ? "badge-published"
                          : d.durum === "HATA"
                            ? "badge-archived"
                            : "badge-scheduled"
                      }`}
                    >
                      {d.durum === "GONDERILIYOR" ? "Gönderiliyor" : d.durum}
                    </span>
                  </td>
                  {/* KONU YAYININDA HEDEF SAYISI YOK ve uydurulmuyor:
                      FCM konuya kaç cihazın abone olduğunu söylemiyor. */}
                  <td style={{ textAlign: "right" }}>
                    {d.hedefSayisi == null ? (
                      <span className="muted" title="Konu yayını — FCM abone sayısını vermiyor">
                        —
                      </span>
                    ) : (
                      d.hedefSayisi
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {d.hedefSayisi == null
                      ? d.basarili > 0
                        ? "gönderildi"
                        : "—"
                      : d.basarili}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
