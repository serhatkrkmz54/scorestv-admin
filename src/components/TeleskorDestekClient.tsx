"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiTeleskorDestekListe,
  apiTeleskorDestekYazisma,
  apiTeleskorDestekCevap,
  apiTeleskorDestekDurum,
  ApiError,
} from "@/lib/api-client";
import type {
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
export default function TeleskorDestekClient() {
  const [talepler, setTalepler] = useState<TeleskorDestekTalebi[]>([]);
  const [secili, setSecili] = useState<TeleskorDestekYazismasi | null>(null);
  const [seciliId, setSeciliId] = useState<number | null>(null);
  const [durumSuzgeci, setDurumSuzgeci] = useState<string>("");
  const [cevap, setCevap] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

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
    if (!seciliId || !cevap.trim() || busy) return;
    setBusy(true);
    try {
      setSecili(await apiTeleskorDestekCevap(seciliId, cevap.trim()));
      setCevap("");
      setHata(null);
      await load();
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Cevap gönderilemedi.");
    } finally {
      setBusy(false);
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
                <span>{t.gorunenAd || t.kullaniciAdi || "—"}</span>
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
                        ? m.adminAd || "Teleskor Destek"
                        : secili.gorunenAd || secili.kullaniciAdi || "Kullanıcı"}
                      <span className="muted"> · {formatDate(m.an)}</span>
                    </div>
                    <div className="destek-balon-metin">{m.metin}</div>
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
                <div className="spread">
                  <span className="muted" style={{ fontSize: 12 }}>
                    Cevap gidince talep &quot;Cevaplandı&quot; olur ve
                    kullanıcıya bildirim düşer.
                  </span>
                  <button
                    className="btn btn-primary"
                    disabled={busy || !cevap.trim()}
                    onClick={() => void gonder()}
                  >
                    {busy ? "Gönderiliyor…" : "Cevabı gönder"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
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
