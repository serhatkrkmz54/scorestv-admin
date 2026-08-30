"use client";

import { useCallback, useEffect, useState } from "react";
import { apiSozlesmeler, apiSozlesmeYayinla, ApiError } from "@/lib/api-client";
import type { SozlesmeMetni } from "@/lib/types";
import { formatDate } from "@/lib/format";

/**
 * SÖZLEŞME METİNLERİ — sürüm yayınlama.
 *
 * <h3>Metnin KENDİSİ burada değil</h3>
 * Metinler teleskor.com.tr'de yayınlanıyor; burada yalnız <b>adresi ve
 * SHA-256 özeti</b> duruyor. Özet, "o gün başka bir metin
 * gösteriyordunuz" iddiasına karşı elimizdeki tek kanıt — o yüzden
 * isteğe bağlı ama şiddetle önerilir.
 *
 * <h3>Yeni sürüm yayınlamak erişimi KESMİYOR</h3>
 * Var olan kullanıcılar uygulamayı kullanmaya devam ediyor; eksik onay
 * bir pencereyle isteniyor. Canlı maç izleyen birini ekranda kilitlemek
 * doğru olmaz — kanuni gereklilik onayı ALMAK, kullanıcıyı
 * cezalandırmak değil.
 *
 * <h3>Ticari ileti izni ZORUNLU olamaz</h3>
 * Rıza hizmetin şartı yapılırsa "özgür irade" koşulu düşer ve rıza
 * geçersiz olur (6563 sayılı kanun). Sunucu bunu 400 ile reddediyor;
 * form da o seçeneği kapatıyor.
 */

const TURLER: [string, string][] = [
  ["KVKK_NOTICE", "KVKK Aydınlatma Metni"],
  ["PRIVACY", "Gizlilik Politikası"],
  ["TERMS", "Kullanım Şartları"],
  ["MARKETING", "Ticari İleti İzni"],
];

const BOS = {
  type: "TERMS",
  version: "",
  url: "",
  contentSha256: "",
  mandatory: true,
  effectiveFrom: "",
  reason: "",
};

export default function TeleskorSozlesmeClient() {
  const [metinler, setMetinler] = useState<SozlesmeMetni[]>([]);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BOS });
  const [acik, setAcik] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMetinler(await apiSozlesmeler());
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Metinler alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // TİCARİ İLETİ ZORUNLU OLAMAZ — form da bunu biliyor.
  const ticari = form.type === "MARKETING";

  async function yayinla() {
    if (!form.version.trim() || !form.url.trim() || !form.reason.trim()) {
      setHata("Sürüm, adres ve gerekçe zorunlu.");
      return;
    }
    setGonderiliyor(true);
    try {
      await apiSozlesmeYayinla({
        type: form.type,
        version: form.version.trim(),
        url: form.url.trim(),
        contentSha256: form.contentSha256.trim() || undefined,
        mandatory: ticari ? false : form.mandatory,
        effectiveFrom: form.effectiveFrom
          ? new Date(form.effectiveFrom).toISOString()
          : undefined,
        reason: form.reason.trim(),
      });
      setForm({ ...BOS });
      setAcik(false);
      setHata(null);
      await load();
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Yayınlanamadı.");
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Teleskor — Sözleşmeler</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Metinlerin kendisi <b>teleskor.com.tr</b>&apos;de; burada adresi ve
            SHA-256 özeti duruyor. Özet, &quot;o gün başka bir metin
            gösteriyordunuz&quot; iddiasına karşı elimizdeki tek kanıt.
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setAcik((v) => !v)}>
          {acik ? "Kapat" : "Yeni Sürüm"}
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      {acik && (
        <div className="card card-pad">
          <div className="card-title">Yeni sürüm yayınla</div>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
            Yeni sürüm var olan kullanıcıların erişimini <b>kesmez</b>; eksik
            onay uygulamada bir pencereyle istenir. Sürüm numarası
            uygulamanın gönderdiğiyle birebir eşleşmeli — uyuşmazsa kayıt
            409 döner.
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="label">Metin türü</label>
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {TURLER.map(([k, ad]) => (
                  <option key={k} value={k}>
                    {ad}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Sürüm</label>
              <input
                className="input"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="1.0"
              />
            </div>
            <div className="field">
              <label className="label">Adres (URL)</label>
              <input
                className="input"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://www.teleskor.com.tr/kullanim-sartlari"
              />
            </div>
            <div className="field">
              <label className="label">SHA-256 özeti (64 karakter)</label>
              <input
                className="input"
                value={form.contentSha256}
                onChange={(e) =>
                  setForm({ ...form, contentSha256: e.target.value })
                }
                placeholder="isteğe bağlı ama önerilir"
              />
            </div>
            <div className="field">
              <label className="label">Yürürlük tarihi</label>
              <input
                className="input"
                type="datetime-local"
                value={form.effectiveFrom}
                onChange={(e) =>
                  setForm({ ...form, effectiveFrom: e.target.value })
                }
              />
              <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                Boşsa hemen. İleri tarih verilirse o güne kadar yürürlükte
                görünmez.
              </div>
            </div>
            <div className="field">
              <label className="label">Gerekçe (zorunlu)</label>
              <input
                className="input"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Hukukçu revizyonu"
              />
            </div>
          </div>

          <label className="check-row" style={{ marginTop: 10 }}>
            <input
              type="checkbox"
              checked={ticari ? false : form.mandatory}
              disabled={ticari}
              onChange={(e) => setForm({ ...form, mandatory: e.target.checked })}
            />
            Zorunlu — kayıt olurken onaylanması şart
          </label>
          {ticari && (
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Ticari ileti izni <b>zorunlu tutulamaz</b>: rıza hizmetin şartı
              yapılırsa &quot;özgür irade&quot; koşulu düşer ve rıza geçersiz
              olur (6563 sayılı kanun). Sunucu da reddediyor.
            </div>
          )}

          <div className="form-actions">
            <button
              className="btn btn-primary"
              disabled={gonderiliyor}
              onClick={yayinla}
            >
              {gonderiliyor ? "Yayınlanıyor…" : "Yayınla"}
            </button>
            <button className="btn btn-ghost" onClick={() => setAcik(false)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}

      <div className="card card-pad">
        <div className="card-title">Yürürlükteki metinler</div>
        {loading ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Yükleniyor…
          </div>
        ) : metinler.length === 0 ? (
          <div className="alert alert-info" style={{ fontSize: 13 }}>
            <b>Hiç metin yayınlanmamış.</b> Bu durumda kayıt olurken hiçbir
            onay istenmiyor — uygulama çalışır ama KVKK aydınlatma
            yükümlülüğü karşılanmamış olur.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Metin</th>
                <th style={{ width: 90 }}>Sürüm</th>
                <th style={{ width: 100 }}>Zorunlu</th>
                <th style={{ width: 160 }}>Yürürlük</th>
                <th>Adres</th>
              </tr>
            </thead>
            <tbody>
              {metinler.map((m) => (
                <tr key={`${m.type}:${m.version}`}>
                  <td style={{ fontWeight: 600 }}>{m.displayName}</td>
                  <td>{m.version}</td>
                  <td>
                    {m.mandatory ? (
                      <span className="badge badge-published">zorunlu</span>
                    ) : (
                      <span className="badge">isteğe bağlı</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12.5 }}>
                    {formatDate(m.effectiveFrom)}
                  </td>
                  <td style={{ fontSize: 12.5, wordBreak: "break-all" }}>
                    {/* Yeni sekmede: panelden çıkıp geri gelmek, açık bir
                        formu kaybettirirdi. */}
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--accent, #2563eb)" }}
                    >
                      {m.url}
                    </a>
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
