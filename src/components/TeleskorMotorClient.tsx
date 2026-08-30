"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiMotorOzeti,
  apiMotorSenkronCalistir,
  apiMotorTablo,
  apiMotorKimlik,
  apiMotorArsiv,
  apiMotorArsivIslem,
  ApiError,
} from "@/lib/api-client";
import type {
  MotorOzeti,
  SenkronSatiri,
  TabloOrnegi,
  KimlikSonucu,
  ArsivDurumu,
} from "@/lib/types";
import { formatDate } from "@/lib/format";
import TeleskorOnayModal from "./TeleskorOnayModal";

/**
 * MOTOR OPERASYONU — senkron, kimlik arama, tablo gözat, arşiv.
 *
 * <h3>Motorun kendi paneli duruyor</h3>
 * Orası SSH tüneli istiyor. Bu ekran aynı işleri tarayıcıdan yapılabilir
 * kılıyor; kuralların tamamı yine motorda (beyaz listeler, kira, kota).
 * Burada tek satır iş kuralı yok — ikinci bir kural kümesi yazılsaydı biri
 * güncellendiğinde diğeri sessizce eskiyi uygulardı.
 *
 * <h3>Dört rapor PARALEL çekiliyor</h3>
 * Biri düşerse diğerleri gösteriliyor. "Motor ne durumda" sorusunun
 * cevabının tek bir rapor yüzünden tamamen boş kalması ters bir sonuç
 * olurdu.
 *
 * <h3>TETİKLEYEN İŞLEMLER ONAY İSTİYOR</h3>
 * Senkron çalıştırma sağlayıcıya istek attırıyor (kota); arşiv yükleme
 * 1,8 GB'lık, saatler süren bir iş. Okuma düğmeleriyle aynı kolaylıkta
 * olmamalılar.
 */

/** Bu eşiğin üstünde art arda hata varsa müdahale gerekiyor (motorun kuralı). */
const HATA_ESIGI = 3;

function durumRozeti(durum: string) {
  const iyi = durum === "SAĞLIKLI" || durum === "ÇALIŞIYOR";
  const kapali = durum === "KAPALI";
  return (
    <span
      className={`badge ${
        iyi ? "badge-published" : kapali ? "" : "badge-archived"
      }`}
    >
      {durum}
    </span>
  );
}

/**
 * ISO-8601 süreyi okunur hâle getirir (P1D → "günde bir").
 *
 * <p>Ham hâliyle gösterilseydi "PT2M" ile "P2M" (iki dakika / iki ay)
 * arasındaki fark tek harfe kalırdı.
 */
function araligiYaz(aralik: string | null | undefined): string {
  if (!aralik) return "—";
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(aralik);
  if (!m) return aralik;
  const [, g, s, dk, sn] = m;
  if (g) return g === "1" ? "günde bir" : `${g} günde bir`;
  if (s) return s === "1" ? "saatte bir" : `${s} saatte bir`;
  if (dk) return dk === "1" ? "dakikada bir" : `${dk} dakikada bir`;
  if (sn) return `${sn} saniyede bir`;
  return aralik;
}

export default function TeleskorMotorClient() {
  const [ozet, setOzet] = useState<MotorOzeti | null>(null);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  // Kimlik arama
  const [aramaYonu, setAramaYonu] = useState<"saglayici" | "bizim">("saglayici");
  const [aramaKimlik, setAramaKimlik] = useState("");
  const [aramaTur, setAramaTur] = useState("TEAM");
  const [aramaSonuc, setAramaSonuc] = useState<KimlikSonucu | null>(null);
  const [aramaHata, setAramaHata] = useState<string | null>(null);

  // Tablo gözat
  const [tabloAdi, setTabloAdi] = useState("");
  const [tablo, setTablo] = useState<TabloOrnegi | null>(null);
  const [tabloHata, setTabloHata] = useState<string | null>(null);

  // Arşiv
  const [arsiv, setArsiv] = useState<ArsivDurumu | null>(null);
  const [arsivAcik, setArsivAcik] = useState(false);
  const [onay, setOnay] = useState<
    | { tur: "senkron"; kaynak: string }
    | { tur: "arsiv-yukle" }
    | { tur: "arsiv-durdur" }
    | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOzet(await apiMotorOzeti());
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Motor raporu alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const arsivYukle = useCallback(async () => {
    try {
      setArsiv(await apiMotorArsiv());
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Arşiv durumu alınamadı.");
    }
  }, []);

  useEffect(() => {
    if (arsivAcik) arsivYukle();
  }, [arsivAcik, arsivYukle]);

  const senkron = ozet?.senkron ?? [];
  const plan = ozet?.plan ?? {};
  const durum = ozet?.durum;
  const kota = ozet?.kota;

  // HATALI KAYNAKLAR ÜSTE: bir sorun varsa aramaya gerek kalmasın.
  const sirali = useMemo(() => {
    return [...senkron].sort((a, b) => {
      const fark = b.errorStreak - a.errorStreak;
      if (fark !== 0) return fark;
      return a.resource.localeCompare(b.resource, "tr");
    });
  }, [senkron]);

  const hataliSayi = senkron.filter((s) => s.errorStreak >= HATA_ESIGI).length;

  async function senkronCalistir(kaynak: string) {
    const r = await apiMotorSenkronCalistir(kaynak);
    setBilgi(
      r.basarili
        ? `${r.kaynak}: ${r.kayit} kayıt, ${r.sureMs} ms.`
        : `${r.kaynak} başarısız: ${r.hata ?? "sebep bilinmiyor"}`,
    );
    await load();
  }

  async function kimlikAra() {
    setAramaHata(null);
    setAramaSonuc(null);
    const deger = aramaKimlik.trim();
    if (!deger) return;
    try {
      setAramaSonuc(
        await apiMotorKimlik(
          aramaYonu === "saglayici"
            ? { saglayici: deger }
            : { tur: aramaTur, id: deger },
        ),
      );
    } catch (e) {
      setAramaHata(e instanceof ApiError ? e.message : "Aranamadı.");
    }
  }

  async function tabloGoster(ad: string) {
    setTabloHata(null);
    setTablo(null);
    if (!ad.trim()) return;
    try {
      setTablo(await apiMotorTablo(ad.trim()));
    } catch (e) {
      setTabloHata(
        e instanceof ApiError
          ? e.message
          : "Tablo okunamadı (motorun beyaz listesinde olmayabilir).",
      );
    }
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Teleskor — Motor</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Senkron kaynakları, sağlayıcı kotası, kimlik arama ve arşiv.
            Kuralların tamamı motorda — burası yalnızca penceresi.
          </div>
        </div>
        <button className="btn" disabled={loading} onClick={load}>
          {loading ? "Yükleniyor…" : "Yenile"}
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}
      {bilgi && (
        <div className="alert alert-info" onClick={() => setBilgi(null)}>
          {bilgi}
        </div>
      )}

      {/* ---------------------------------------------------------- ÖZET */}
      <div className="card card-pad">
        <div className="card-title">Motorun kendi gözü</div>
        {!durum ? (
          <div className="muted" style={{ fontSize: 13 }}>
            {loading ? "Yükleniyor…" : "Alınamadı."}
          </div>
        ) : (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">Veritabanı</div>
                <div className="stat-value" style={{ fontSize: 15 }}>
                  {durum.veritabani.baglantiVar ? "bağlı" : "YOK"}
                </div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  {durum.veritabani.ad ?? "—"}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Redis</div>
                <div className="stat-value" style={{ fontSize: 15 }}>
                  {durum.redis.calisiyor ? "çalışıyor" : "YOK"}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Canlı kanal</div>
                <div className="stat-value" style={{ fontSize: 15 }}>
                  {durum.canliKanal.aktifKanal ?? "—"}
                </div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  {durum.canliKanal.veriAkiyor ? "veri akıyor" : "veri YOK"}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Kota (bu dakika)</div>
                <div className="stat-value" style={{ fontSize: 15 }}>
                  {durum.kota.buDakika} / {durum.kota.tavan}
                </div>
              </div>
            </div>

            {/* ÖLÇÜT "BAĞLI MI" DEĞİL "VERİ GELİYOR MU": broker bağlantıyı
                açık tutup hiçbir şey yayınlamayabilir (yanlış konu, iptal
                edilmiş abonelik) ve o durumda ekran "bağlı" derken canlı
                skor sessizce durur. */}
            {durum.canliKanal.bagli && !durum.canliKanal.veriAkiyor && (
              <div className="alert alert-error" style={{ marginTop: 10 }}>
                <b>MQTT bağlı ama veri gelmiyor.</b> Önce saat kaç (maç var
                mı) bakılır, sonra konu sürümü (<code>v1</code> →{" "}
                <code>v2</code> mi oldu?), sonra IP beyaz listesi. Yoklama
                kanalı devrede olduğu için <b>veri kaybı yok</b>, yalnız kota
                artıyor.
              </div>
            )}
            {durum.canliKanal.sonHata && (
              <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                Son kanal hatası: {durum.canliKanal.sonHata}
              </div>
            )}
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Son mesaj: {formatDate(durum.canliKanal.sonMesaj)} ·{" "}
              {durum.canliKanal.mesajSayisi} mesaj ·{" "}
              {durum.canliKanal.yazilanBolum} bölüm yazıldı · sağlayıcı
              kimliği {durum.saglayici.kimlikTanimli ? "tanımlı" : "TANIMSIZ"}
            </div>
          </>
        )}
      </div>

      {/* ------------------------------------------------------- SENKRON */}
      <div className="card card-pad">
        <div className="spread" style={{ marginBottom: 8 }}>
          <div className="card-title" style={{ margin: 0 }}>
            Senkron kaynakları ({senkron.length})
          </div>
          {hataliSayi > 0 && (
            <span className="badge badge-archived">
              {hataliSayi} kaynakta art arda hata
            </span>
          )}
        </div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          Sıradaki çalışma zamanı <b>veritabanında</b> duruyor: motor yeniden
          başlasa da değişmiyor, iki kopya aynı anda çalışmıyor. Elle
          çalıştırma da <b>aynı kirayı</b> kullanıyor.
        </div>

        {sirali.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>
            {loading ? "Yükleniyor…" : "Kaynak yok."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kaynak</th>
                  <th style={{ width: 110 }}>Durum</th>
                  <th style={{ width: 130 }}>Sıklık</th>
                  <th style={{ width: 150 }}>Sıradaki</th>
                  <th style={{ width: 150 }}>Son başarı</th>
                  <th style={{ textAlign: "right", width: 90 }}>Son kayıt</th>
                  <th style={{ textAlign: "right", width: 90 }}>Toplam</th>
                  <th style={{ width: 90 }} />
                </tr>
              </thead>
              <tbody>
                {sirali.map((s: SenkronSatiri) => {
                  const p = plan[s.resource];
                  const sorunlu = s.errorStreak >= HATA_ESIGI;
                  return (
                    <tr key={s.resource}>
                      <td style={{ fontSize: 12.5 }}>
                        <div style={{ fontWeight: 600 }}>{s.resource}</div>
                        <div className="muted" style={{ fontSize: 11.5 }}>
                          {s.mode.toLowerCase()}
                          {p?.gecikemez && " · gecikemez"}
                          {p?.gecikmeyeDuyarli && " · duyarlı"}
                        </div>
                        {s.lastError && (
                          <div
                            style={{
                              fontSize: 11.5,
                              color: sorunlu
                                ? "var(--danger, #dc2626)"
                                : "var(--muted, #6b7280)",
                              marginTop: 2,
                            }}
                          >
                            {s.errorStreak > 1 && `${s.errorStreak}× · `}
                            {s.lastError}
                          </div>
                        )}
                      </td>
                      <td>{durumRozeti(s.durum)}</td>
                      <td style={{ fontSize: 12 }}>
                        {araligiYaz(p?.aralik)}
                        {/* BELGENİN ÖNERDİĞİ SIKLIK: sapma varsa göze
                            çarpsın diye motor bunu da gönderiyor. */}
                        {p?.not && (
                          <div className="muted" style={{ fontSize: 11 }}>
                            belge: {p.not}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }}>{formatDate(s.nextRunAt)}</td>
                      <td style={{ fontSize: 12 }}>
                        {formatDate(s.lastSuccessAt)}
                      </td>
                      <td style={{ textAlign: "right" }}>{s.lastCount}</td>
                      <td style={{ textAlign: "right" }}>{s.totalCount}</td>
                      <td>
                        <button
                          className="btn btn-sm"
                          disabled={s.running}
                          title={
                            s.running
                              ? "Zaten çalışıyor (kira başkasında)"
                              : "Sağlayıcıya istek atar — kotayı ilgilendirir"
                          }
                          onClick={() =>
                            setOnay({ tur: "senkron", kaynak: s.resource })
                          }
                        >
                          {s.running ? "çalışıyor" : "Çalıştır"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------- KOTA */}
      <div className="card card-pad">
        <div className="card-title">Sağlayıcıya giden istekler</div>
        {!kota ? (
          <div className="muted" style={{ fontSize: 13 }}>
            {loading ? "Yükleniyor…" : "Alınamadı."}
          </div>
        ) : (
          <>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
              {kota.totalCalls} istek · son{" "}
              {Math.round(kota.elapsedSeconds / 60)} dakika · bu dakika{" "}
              <b>
                {kota.usedThisMinute} / {kota.limitPerMinute}
              </b>
            </div>
            {kota.endpoints.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>
                Henüz istek yok.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Uç</th>
                      <th style={{ textAlign: "right" }}>İstek</th>
                      <th style={{ textAlign: "right" }}>Hata</th>
                      <th style={{ textAlign: "right" }}>Kayıt</th>
                      <th style={{ textAlign: "right" }}>Ort. ms</th>
                      <th style={{ textAlign: "right" }}>En yavaş</th>
                      <th>Hata kodları</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kota.endpoints.map((u) => (
                      <tr key={`${u.source}:${u.path}`}>
                        <td style={{ fontSize: 12 }}>{u.path}</td>
                        <td style={{ textAlign: "right" }}>{u.calls}</td>
                        <td
                          style={{
                            textAlign: "right",
                            color:
                              u.failures > 0
                                ? "var(--danger, #dc2626)"
                                : undefined,
                          }}
                        >
                          {u.failures}
                        </td>
                        <td style={{ textAlign: "right" }}>{u.records}</td>
                        <td style={{ textAlign: "right" }}>{u.avgMillis}</td>
                        <td style={{ textAlign: "right" }}>{u.maxMillis}</td>
                        <td style={{ fontSize: 11.5 }}>
                          {/* KOD 405 İKİ AYRI ŞEY DEMEK: paket kapsamı ya da
                              parametre kısıtı (en yeni sezon değil, 30 gün
                              penceresi dışında). Burada ham gösteriliyor —
                              sebep uydurmuyoruz. */}
                          {Object.entries(u.errorCodes ?? {})
                            .map(([k, v]) => `${k}×${v}`)
                            .join(" · ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ------------------------------------------------- KİMLİK ARAMA */}
      <div className="card card-pad">
        <div className="card-title">Kimlik arama</div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          Sağlayıcı kimlikleri <b>yalnız kendi türü içinde</b> benzersiz —
          aynı metin birden çok varlığa denk gelebiliyor, o yüzden arama tüm
          türlerde yapılıyor ve birden çok sonuç dönebilir.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            className="input"
            style={{ maxWidth: 190 }}
            value={aramaYonu}
            onChange={(e) =>
              setAramaYonu(e.target.value as "saglayici" | "bizim")
            }
          >
            <option value="saglayici">Sağlayıcı kimliği → bizde</option>
            <option value="bizim">Bizim kimliğimiz → sağlayıcıda</option>
          </select>
          {aramaYonu === "bizim" && (
            <input
              className="input"
              style={{ maxWidth: 150 }}
              value={aramaTur}
              onChange={(e) => setAramaTur(e.target.value)}
              placeholder="TEAM"
            />
          )}
          <input
            className="input"
            style={{ maxWidth: 280 }}
            value={aramaKimlik}
            onChange={(e) => setAramaKimlik(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && kimlikAra()}
            placeholder={
              aramaYonu === "saglayici" ? "kp3glrw7hwqdyjv" : "1234"
            }
          />
          <button className="btn" onClick={kimlikAra}>
            Ara
          </button>
        </div>
        {aramaHata && (
          <div className="alert alert-error" style={{ marginTop: 10 }}>
            {aramaHata}
          </div>
        )}
        {aramaSonuc && (
          <pre
            style={{
              marginTop: 10,
              padding: 12,
              overflowX: "auto",
              fontSize: 12,
              background: "var(--surface-2, #f6f7f9)",
              borderRadius: 8,
            }}
          >
            {JSON.stringify(aramaSonuc, null, 2)}
          </pre>
        )}
      </div>

      {/* -------------------------------------------------- TABLO GÖZAT */}
      <div className="card card-pad">
        <div className="card-title">Tablodan örnek kayıtlar</div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          &quot;Yazdı mı yazmadı mı&quot; kontrolü. Hangi tabloların
          okunabileceğini <b>motor</b> belirliyor; liste burada
          tekrarlanmıyor — iki yerde tutulsaydı biri güncellendiğinde diğeri
          var olan bir tabloyu &quot;yok&quot; sanardı.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            style={{ maxWidth: 280 }}
            value={tabloAdi}
            onChange={(e) => setTabloAdi(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tabloGoster(tabloAdi)}
            placeholder="match / team / sync_checkpoint"
          />
          <button className="btn" onClick={() => tabloGoster(tabloAdi)}>
            Göster
          </button>
        </div>
        {tabloHata && (
          <div className="alert alert-error" style={{ marginTop: 10 }}>
            {tabloHata}
          </div>
        )}
        {tablo && (
          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table className="data-table">
              <thead>
                <tr>
                  {tablo.sutunlar.map((c) => (
                    <th key={c} style={{ fontSize: 11.5 }}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tablo.satirlar.map((r, i) => (
                  <tr key={i}>
                    {tablo.sutunlar.map((c) => (
                      <td
                        key={c}
                        style={{ fontSize: 11.5, whiteSpace: "nowrap" }}
                      >
                        {r[c] === null || r[c] === undefined
                          ? "—"
                          : String(r[c]).slice(0, 60)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------- ARŞİV */}
      <div className="card card-pad">
        <div className="spread">
          <div className="card-title" style={{ margin: 0 }}>
            Arşiv yüklemesi
          </div>
          <button className="btn btn-sm" onClick={() => setArsivAcik((v) => !v)}>
            {arsivAcik ? "Gizle" : "Göster"}
          </button>
        </div>
        {arsivAcik && (
          <div style={{ marginTop: 10 }}>
            <div className="alert alert-info" style={{ fontSize: 12.5 }}>
              <b>1,8 GB, saatler sürer.</b> Bu yüzden otomatik değil: canlı
              trafiğin ortasında kendi kendine başlamamalı. Durdurma sert
              kesme değil — işlenen parti bitince duruyor, yarım kalan dosya
              damgalanmıyor ve sonraki tetiklemede baştan okunuyor (yazımlar
              idempotent).
            </div>
            {!arsiv ? (
              <div className="muted" style={{ fontSize: 13 }}>
                Yükleniyor…
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span
                    className={`badge ${
                      arsiv.calisiyor ? "badge-published" : ""
                    }`}
                  >
                    {arsiv.calisiyor ? "çalışıyor" : "durgun"}
                  </span>
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    {arsiv.ozet?.biten ?? 0} / {arsiv.ozet?.dosya ?? 0} dosya ·{" "}
                    {arsiv.ozet?.kayit ?? 0} kayıt ·{" "}
                    {arsiv.ozet?.bilinmeyenMac ?? 0} bilinmeyen maç
                  </span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button className="btn btn-sm" onClick={arsivYukle}>
                      Yenile
                    </button>
                    {arsiv.calisiyor ? (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => setOnay({ tur: "arsiv-durdur" })}
                      >
                        Durdur
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setOnay({ tur: "arsiv-yukle" })}
                      >
                        Yüklemeyi başlat
                      </button>
                    )}
                  </div>
                </div>

                {arsiv.dosyalar.length > 0 && (
                  <div style={{ overflowX: "auto", marginTop: 10 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Dosya</th>
                          <th style={{ width: 90 }}>Tür</th>
                          <th style={{ textAlign: "right" }}>Okunan</th>
                          <th style={{ textAlign: "right" }}>Yazılan</th>
                          <th style={{ textAlign: "right" }}>Atlanan</th>
                          <th style={{ width: 150 }}>Bitti</th>
                        </tr>
                      </thead>
                      <tbody>
                        {arsiv.dosyalar.map((d) => (
                          <tr key={d.ad}>
                            <td style={{ fontSize: 12 }}>
                              {d.ad}
                              {d.son_hata && (
                                <div
                                  style={{
                                    fontSize: 11.5,
                                    color: "var(--danger, #dc2626)",
                                  }}
                                >
                                  {d.son_hata}
                                </div>
                              )}
                            </td>
                            <td style={{ fontSize: 12 }}>{d.tur}</td>
                            <td style={{ textAlign: "right" }}>
                              {d.kayit_okunan ?? 0}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {d.bolum_yazilan ?? 0}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {d.atlanan_mac ?? 0}
                            </td>
                            <td style={{ fontSize: 12 }}>
                              {d.bitti_at ? formatDate(d.bitti_at) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------- ONAY */}
      {onay?.tur === "senkron" && (
        <TeleskorOnayModal
          baslik={`Kaynağı çalıştır: ${onay.kaynak}`}
          uyari="Bu kaynak SAĞLAYICIYA istek atar ve dakikalık kotayı kullanır. Zamanlanmış turla aynı kirayı kullandığı için aynı anda iki çalıştırma olmaz."
          alanEtiketi="Onaylamak için kaynağın adını yazın"
          alanIpucu={onay.kaynak}
          onayMetni="Çalıştır"
          onKapat={() => setOnay(null)}
          onOnayla={async (deger) => {
            // ADI YAZDIRMAK bir formalite değil: tablodaki satırlar
            // birbirine çok benziyor ve yanlış satırın düğmesine basmak
            // kolay. Yazarken hangi kaynağı çalıştırdığını görüyor.
            if (deger !== onay.kaynak) {
              throw new ApiError(400, "Kaynak adı eşleşmedi.");
            }
            await senkronCalistir(onay.kaynak);
            setOnay(null);
          }}
        />
      )}

      {onay?.tur === "arsiv-yukle" && (
        <TeleskorOnayModal
          baslik="Arşiv yüklemesini başlat"
          uyari="1,8 GB'lık, saatler süren bir iş. Canlı trafiğin üstüne binecek. Kaldığı yerden devam eder; zaten çalışıyorsa reddedilir."
          alanEtiketi="Onaylamak için BASLAT yazın"
          alanIpucu="BASLAT"
          onayMetni="Başlat"
          onKapat={() => setOnay(null)}
          onOnayla={async (deger) => {
            if (deger.toUpperCase() !== "BASLAT") {
              throw new ApiError(400, "Onay metni eşleşmedi.");
            }
            const r = await apiMotorArsivIslem("yukle");
            setBilgi(r.mesaj ?? "Arşiv yüklemesi başladı.");
            setOnay(null);
            await arsivYukle();
          }}
        />
      )}

      {onay?.tur === "arsiv-durdur" && (
        <TeleskorOnayModal
          baslik="Arşiv yüklemesini durdur"
          uyari="Sert kesme değil: işlenen parti bitince duruyor. Yarım kalan dosya damgalanmadığı için sonraki tetiklemede baştan okunur — veri kaybı olmaz."
          alanEtiketi="Onaylamak için DURDUR yazın"
          alanIpucu="DURDUR"
          onayMetni="Durdur"
          tehlikeli
          onKapat={() => setOnay(null)}
          onOnayla={async (deger) => {
            if (deger.toUpperCase() !== "DURDUR") {
              throw new ApiError(400, "Onay metni eşleşmedi.");
            }
            const r = await apiMotorArsivIslem("durdur");
            setBilgi(r.mesaj ?? "Durdurma isteği gönderildi.");
            setOnay(null);
            await arsivYukle();
          }}
        />
      )}
    </div>
  );
}
