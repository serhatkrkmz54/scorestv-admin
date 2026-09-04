"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiTeleskorSaglik,
  apiTeleskorYayinTani,
  ApiError,
} from "@/lib/api-client";
import type { SaglikOzeti, YayinTanisi } from "@/lib/types";

/**
 * SİSTEM SAĞLIĞI — "bir şey mi bozuldu" sorusunun tek bakışta cevabı.
 *
 * <h3>Üç ayrı rapor, üç ayrı soru</h3>
 * <ol>
 *   <li><b>Motor durumu:</b> ürün motora ulaşabiliyor mu, devre kesik mi.
 *       Skorlar gelmiyorsa ilk bakılacak yer.</li>
 *   <li><b>Motor kullanımı:</b> önbellek isabet oranı. DÜŞÜK OLMASI TEK
 *       BAŞINA SORUN DEĞİL — canlı kayıt 3 saniye taze, uygulama 8
 *       saniyede bir yokluyor; önbellek ancak aynı maçı aynı anda çok kişi
 *       açtığında devreye giriyor. Anlamlı olan, trafik yüksekken düşük
 *       kalması.</li>
 *   <li><b>Veritabanı yükü:</b> uç başına sorgu sayısı. Yükselen TEKİL
 *       sütunu, araya girmiş bir döngünün (N+1) ilk işareti — toplam
 *       değil: 33 gidiş-dönüşün 32'si toplu yazımsa o satır bir N+1
 *       DEĞİL (Bilyoner bülteni tam olarak böyle görünüyordu ve
 *       sunucudaki alarm bu yüzden düzeltilmişti; panel eski kuralı
 *       taşımaya devam ediyordu).</li>
 *   <li><b>Yayın tanısı:</b> "şalteri açtım ama düğme çıkmadı" — beş
 *       kapıdan hangisinin kapalı olduğunu söylüyor.</li>
 * </ol>
 *
 * <h3>SALT OKUNUR</h3>
 * Sayaç sıfırlama uçları BİLEREK bağlanmadı. Sıfırlama bir ölçüm aracı
 * ("sıfırla, akışı koştur, raporu al") ve panelden yanlışlıkla basılması,
 * o sırada süren bir ölçümü sessizce bozardı. Gerektiğinde Bruno'dan.
 */
/**
 * Bu eşiğin ALTINDA düşük isabet normal, ÜSTÜNDE sorun işareti.
 *
 * <p>3 saniyelik tazelikte bir maçın kaydı saniyede en fazla 0,33 istek
 * doğuruyor. Saniyede 20 istek, kabaca 60 maçın aynı anda izlendiği
 * demek — o kalabalıkta hâlâ sıfır isabet varsa önbellek çalışmıyordur.
 */
const YOGUN_ESIK = 20;

function saniyedeIstek(k: { toplamIstek: number; olcumSaniye: number }): number {
  return k.olcumSaniye > 0 ? k.toplamIstek / k.olcumSaniye : 0;
}

export default function TeleskorSaglikClient() {
  const [veri, setVeri] = useState<SaglikOzeti | null>(null);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  // YAYIN TANISI ayrı state'te ve SAYFAYLA BİRLİKTE ÇEKİLMİYOR: maç
  // kimliği isteyen, elle tetiklenen bir tanı bu. Sayfa açılışında
  // çağrılsaydı her yenilemede sağlayıcıya bir istek daha giderdi.
  const [macId, setMacId] = useState("");
  const [tani, setTani] = useState<YayinTanisi | null>(null);
  const [taniYukleniyor, setTaniYukleniyor] = useState(false);
  const [taniHata, setTaniHata] = useState<string | null>(null);

  async function taniCalistir() {
    setTaniYukleniyor(true);
    setTaniHata(null);
    try {
      const n = macId.trim();
      setTani(await apiTeleskorYayinTani(n ? Number(n) : undefined));
    } catch (e) {
      setTani(null);
      setTaniHata(e instanceof ApiError ? e.message : "Tanı alınamadı.");
    } finally {
      setTaniYukleniyor(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVeri(await apiTeleskorSaglik());
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Rapor alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const motor = veri?.motorDurumu;
  const kullanim = veri?.motorKullanimi;
  const db = veri?.dbYuk;

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Teleskor — Sistem Sağlığı</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Salt okunur. Sayaçlar burada sıfırlanmıyor — sıfırlama bir ölçüm
            adımı ve yanlışlıkla basılması süren bir ölçümü bozardı.
          </div>
        </div>
        <button className="btn" disabled={loading} onClick={load}>
          {loading ? "Yükleniyor…" : "Yenile"}
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      {/* MOTOR DURUMU */}
      <div className="card card-pad">
        <div className="card-title">Motor bağlantısı</div>
        {!motor ? (
          <div className="muted" style={{ fontSize: 13 }}>
            {loading ? "Yükleniyor…" : "Alınamadı."}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span
                className={`badge ${
                  motor.durum === "SAĞLIKLI" ? "badge-published" : "badge-archived"
                }`}
              >
                {motor.durum}
              </span>
              <span className="muted" style={{ fontSize: 12.5 }}>
                {motor.adres ?? "adres tanımsız"} · {motor.yanitMs} ms
              </span>
            </div>
            {motor.hata && (
              <div className="alert alert-error" style={{ marginTop: 10 }}>
                {motor.hata}
              </div>
            )}
            {motor.devreKesik && (
              <div className="alert alert-error" style={{ marginTop: 10 }}>
                <b>Devre kesik.</b> Üst üste {motor.ustUsteHata} hata sonrası
                motora {motor.devreAcikKalmaSaniye} saniye boyunca hiç istek
                gitmiyor. Skorlar önbellekteki eski veriden servis ediliyor.
              </div>
            )}
          </>
        )}
      </div>

      {/* MOTOR KULLANIMI */}
      <div className="card card-pad">
        <div className="card-title">Motora giden istekler</div>
        {!kullanim ? (
          <div className="muted" style={{ fontSize: 13 }}>
            {loading ? "Yükleniyor…" : "Alınamadı."}
          </div>
        ) : (
          <>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
              {kullanim.toplamIstek} istek · {kullanim.toplamOnbellekIsabeti}{" "}
              önbellekten · <b>%{kullanim.onbellekIsabetOrani}</b> isabet · son{" "}
              {Math.round(kullanim.olcumSaniye / 60)} dakika (
              {saniyedeIstek(kullanim).toFixed(1)} istek/sn)
            </div>

            {/* AÇIKLAMA, UYARI DEĞİL.
                Önce burada "isabet düşük, süreleri gözden geçir" yazıyordu ve
                bu YANLIŞ TAVSİYEYDİ: canlı maç önbelleği 3 saniye taze,
                uygulama 8 saniyede bir yokluyor. Tek izleyicili bir maçta
                ardışık iki yoklama ASLA aynı 3 saniyeye düşmez — yani düşük
                isabet, düşük eşzamanlılığın doğal sonucu. Süreyi 8 saniyeye
                çıkarmak isabeti yükseltirdi ama canlı skoru 8 saniye
                geciktirirdi; "iyileştirme" ürünün asıl işini bozardı.
                Uyarı artık yalnız TRAFİK YÜKSEKKEN çıkıyor — orada düşük
                isabet gerçekten bir sorun işareti. */}
            {kullanim.onbellekIsabetOrani < 40 &&
              (saniyedeIstek(kullanim) >= YOGUN_ESIK ? (
                <div className="alert alert-error" style={{ fontSize: 12.5 }}>
                  <b>Trafik yüksek ama önbellek isabeti düşük.</b> Saniyede{" "}
                  {saniyedeIstek(kullanim).toFixed(1)} istek gidiyor ve
                  neredeyse hiçbiri önbellekten karşılanmıyor. Redis'e
                  ulaşılamıyor olabilir — motor log'unda{" "}
                  <i>&quot;Redis&apos;e ulaşılamıyor; motor önbelleği devre
                  dışı&quot;</i> satırını ara.
                </div>
              ) : (
                <div className="muted" style={{ fontSize: 12 }}>
                  Düşük isabet bu trafikte <b>beklenen</b>: canlı maç kaydı 3
                  saniye taze kalıyor, uygulama 8 saniyede bir yokluyor. Tek
                  izleyicili bir maçta ardışık iki yoklama aynı 3 saniyeye
                  düşmüyor. Önbellek kalabalığa karşı çalışıyor — aynı maçı
                  aynı anda çok kişi açtığında oran kendiliğinden yükselir.
                </div>
              ))}
            {kullanim.uclar.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>
                Henüz istek yok.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Uç</th>
                    <th style={{ textAlign: "right" }}>İstek</th>
                    <th style={{ textAlign: "right" }}>Önbellek</th>
                    <th style={{ textAlign: "right" }}>Bayat</th>
                    <th style={{ textAlign: "right" }}>Hata</th>
                    <th style={{ textAlign: "right" }}>Ort. ms</th>
                    <th style={{ textAlign: "right" }}>En yavaş</th>
                  </tr>
                </thead>
                <tbody>
                  {kullanim.uclar.map((u) => (
                    <tr key={u.path}>
                      <td style={{ fontSize: 12.5 }}>{u.path}</td>
                      <td style={{ textAlign: "right" }}>{u.calls}</td>
                      <td style={{ textAlign: "right" }}>{u.cacheHits}</td>
                      <td style={{ textAlign: "right" }}>{u.staleServed}</td>
                      <td
                        style={{
                          textAlign: "right",
                          color: u.failures > 0 ? "var(--danger, #dc2626)" : undefined,
                        }}
                      >
                        {u.failures}
                      </td>
                      <td style={{ textAlign: "right" }}>{u.avgMillis}</td>
                      <td style={{ textAlign: "right" }}>{u.maxMillis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* VERİTABANI YÜKÜ */}
      <div className="card card-pad">
        <div className="card-title">Veritabanı yükü</div>
        {!db ? (
          <div className="muted" style={{ fontSize: 13 }}>
            {loading ? "Yükleniyor…" : "Alınamadı (ölçüm kapalı olabilir)."}
          </div>
        ) : (
          <>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
              Toplam {db.totalQueries} sorgu · {db.userQueries} kullanıcı
              isteğinden · {db.systemQueries} gece görevlerinden.
              {" "}
              <b>TEKİL sütunu yükselen bir uç</b>, araya girmiş bir döngünün
              (N+1) ilk işaretidir — toplu yazım değil.
            </div>
            {db.operations.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>
                Henüz ölçüm yok.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>İşlem</th>
                    <th style={{ width: 90 }}>Kaynak</th>
                    <th style={{ textAlign: "right" }}>Çalışma</th>
                    <th style={{ textAlign: "right" }}>Ortalama</th>
                    <th
                      style={{ textAlign: "right" }}
                      title="Bunun kadarı TOPLU yazım (batch). Alarm yalnız kalan tekil gidiş-dönüşlere bakar."
                    >
                      Toplu
                    </th>
                    <th style={{ textAlign: "right" }}>Tekil</th>
                    <th style={{ textAlign: "right" }}>En az</th>
                    <th style={{ textAlign: "right" }}>En çok</th>
                    <th style={{ textAlign: "right" }}>Ort. ms</th>
                  </tr>
                </thead>
                <tbody>
                  {db.operations.map((o) => {
                    // TEKİL = toplam − toplu. Alarmın baktığı sayı bu.
                    // Eski sunucu `averageBatches` göndermiyor; o zaman
                    // tekil = toplam olur ve davranış eskisiyle aynı kalır.
                    const toplu = o.averageBatches ?? 0;
                    const tekil = o.averageQueries - toplu;
                    const alarm = tekil > 25;
                    return (
                      <tr key={`${o.source}:${o.operation}`}>
                        <td style={{ fontSize: 12.5 }}>{o.operation}</td>
                        <td style={{ fontSize: 12 }}>{o.source}</td>
                        <td style={{ textAlign: "right" }}>{o.executions}</td>
                        <td style={{ textAlign: "right" }}>
                          {o.averageQueries.toFixed(1)}
                        </td>
                        <td
                          style={{ textAlign: "right" }}
                          className={toplu > 0 ? undefined : "muted"}
                        >
                          {o.averageBatches === undefined
                            ? "—"
                            : toplu.toFixed(1)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: alarm ? 700 : 400,
                            color: alarm ? "var(--danger, #dc2626)" : undefined,
                          }}
                          title={
                            alarm
                              ? "Tekil gidiş-dönüş eşiği (25) aşıldı — araya bir döngü girmiş olabilir."
                              : undefined
                          }
                        >
                          {tekil.toFixed(1)}
                        </td>
                        <td style={{ textAlign: "right" }}>{o.minQueries}</td>
                        <td style={{ textAlign: "right" }}>{o.maxQueries}</td>
                        <td style={{ textAlign: "right" }}>
                          {o.averageMillis.toFixed(0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* YAYIN TANISI

          Uygulamadaki yayın düğmesinin çıkmaması için BEŞ ayrı sebep var
          ve beşi de istemciye aynı sessiz 404 olarak görünüyor — bu doğru
          (üçünde de düğme çizilmemeli), ama sunucu tarafında da ayırt
          edilemiyordu. Bu kart o boşluğu kapatıyor.

          ELLE TETİKLENİYOR: diğer üç rapor sayfa açılışında geliyor, bu
          gelmiyor. Sebebi maç kimliği değil — tanı, sağlayıcıya gerçek
          bir istek atıp "şu an oynatılabilir akış var mı" diye soruyor
          ve önbelleği bilerek atlıyor. Her sayfa yenilemesinde çalışsaydı
          hiç sorulmayan bir soru için sağlayıcıya trafik giderdi. */}
      <div className="card card-pad">
        <div className="card-title">Yayın tanısı</div>
        <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
          &quot;Şalteri açtım ama uygulamada yayın düğmesi çıkmadı&quot; —
          hangi kapının kapalı olduğunu söyler. Maç kimliği <b>boş
          bırakılırsa</b> yalnız ayarlar denetlenir; bir maç kimliği
          yazılırsa o maça özgü kapılar da sınanır (motorun yayın bayrağı,
          lig engeli, sağlayıcıda gerçekten akış var mı).
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="input"
            style={{ maxWidth: 200 }}
            placeholder="Maç kimliği (isteğe bağlı)"
            inputMode="numeric"
            value={macId}
            onChange={(e) =>
              // Yalnız rakam: sunucu Long bekliyor ve serbest metni oraya
              // taşımanın bir faydası yok.
              setMacId(e.target.value.replace(/[^0-9]/g, ""))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") taniCalistir();
            }}
          />
          <button
            className="btn btn-primary"
            disabled={taniYukleniyor}
            onClick={taniCalistir}
          >
            {taniYukleniyor ? "Denetleniyor…" : "Denetle"}
          </button>
        </div>

        {taniHata && (
          <div className="alert alert-error" style={{ marginTop: 10 }}>
            {taniHata}
          </div>
        )}

        {tani && (
          <div style={{ marginTop: 12 }}>
            {/* AÇIKLAMA ÖNCE: sunucunun Türkçe cümlesi zaten "ne yapmalı"yı
                söylüyor; alttaki kutucuklar onun dayanağı. */}
            <div
              className={
                tani.yayinVar ? "alert" : "alert alert-error"
              }
              style={{ fontSize: 13 }}
            >
              {tani.aciklama}
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              <Kapi ad="Şalter (VIDEO_ENABLED)" acik={tani.salterAcik} />
              <Kapi ad="Adres şablonu" acik={tani.sablonVar} />
              {/* TOKEN'IN DEĞERİ DÖNMÜYOR, yalnız dolu mu bilgisi —
                  tanı için gereken de bu. */}
              <Kapi ad="Yayın anahtarı" acik={tani.tokenVar} />
              <Kapi ad="Akış doğrulayıcı" acik={tani.dogrulamaKurulu} />
              {/* `== null` bilerek gevşek: sunucu maç verilmediğinde bu
                  alanı HİÇ göndermiyor (ölçüldü), yani `!== null` her
                  zaman doğru çıkar ve "Maç #undefined" rozeti çizilirdi. */}
              {tani.macId != null && (
                <Kapi ad={`Maç #${tani.macId} yayını`} acik={tani.yayinVar} />
              )}
            </div>
            {tani.macId == null && (
              <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                Yalnız ayarlar denetlendi. Belirli bir maçta düğme
                çıkmıyorsa o maçın kimliğini yazıp tekrar denetle.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Tek kapı: açık/kapalı rozeti. Dört-beş kez tekrarlandığı için ayrı. */
function Kapi({ ad, acik }: { ad: string; acik: boolean }) {
  return (
    <span
      className={`badge ${acik ? "badge-published" : "badge-archived"}`}
      title={acik ? "Bu kapı açık" : "Bu kapı KAPALI"}
    >
      {acik ? "✓" : "✕"} {ad}
    </span>
  );
}
