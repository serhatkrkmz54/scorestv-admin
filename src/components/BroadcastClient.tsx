"use client";

import { useEffect, useRef, useState } from "react";
import {
  apiSendBroadcast,
  apiListBroadcasts,
  apiSendTestNotification,
  ApiError,
} from "@/lib/api-client";
import type {
  BroadcastLang,
  BroadcastListItem,
  BroadcastPlatform,
  BroadcastStatus,
} from "@/lib/types";

const PLATFORM_TR: Record<BroadcastPlatform, string> = {
  ALL: "Hepsi",
  IOS: "iOS",
  ANDROID: "Android",
};
const LANG_TR: Record<BroadcastLang, string> = {
  ALL: "Tüm diller",
  TR: "Türkçe",
  EN: "İngilizce",
};
const STATUS_TR: Record<BroadcastStatus, string> = {
  QUEUED: "Sırada",
  SENT: "Gönderildi",
  FAILED: "Başarısız",
};

export default function BroadcastClient() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [platform, setPlatform] = useState<BroadcastPlatform>("ALL");
  const [lang, setLang] = useState<BroadcastLang>("ALL");

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Test gönderimi — yalnızca bu e-postanın cihazlarına.
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);

  const [history, setHistory] = useState<BroadcastListItem[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadHistory() {
    try {
      setHistory(await apiListBroadcasts(50));
    } catch {
      // geçmiş yüklenemezse sessiz geç (gönderim yine çalışır)
    }
  }

  // İlk yükleme + "Sırada" satır varken ~5 sn'de bir tazele (durum canlı ilerlesin).
  useEffect(() => {
    loadHistory();
    pollRef.current = setInterval(() => {
      setHistory((cur) => {
        if (cur.some((h) => h.status === "QUEUED")) loadHistory();
        return cur;
      });
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function send() {
    setError(null);
    setOk(null);
    if (!title.trim() || !body.trim()) {
      setError("Başlık ve metin dolu olmalı.");
      return;
    }
    if (link.trim() && !/^(https?:\/\/|\/)/.test(link.trim())) {
      setError("Bağlantı http(s):// ile ya da / ile başlamalı.");
      return;
    }
    setSending(true);
    try {
      const res = await apiSendBroadcast({
        title: title.trim(),
        body: body.trim(),
        link: link.trim() || null,
        platform,
        lang,
      });
      setOk(
        `Sıraya alındı — ~${res.recipientCount} cihaza gönderilecek. Birkaç saniye içinde iletilir.`,
      );
      setTitle("");
      setBody("");
      setLink("");
      loadHistory();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Bildirim gönderilemedi.");
    } finally {
      setSending(false);
    }
  }

  async function sendTest() {
    setError(null);
    setOk(null);
    if (!title.trim() || !body.trim()) {
      setError("Başlık ve metin dolu olmalı.");
      return;
    }
    if (!testEmail.trim()) {
      setError("Test için bir e-posta gir.");
      return;
    }
    if (link.trim() && !/^(https?:\/\/|\/)/.test(link.trim())) {
      setError("Bağlantı http(s):// ile ya da / ile başlamalı.");
      return;
    }
    setTestSending(true);
    try {
      const res = await apiSendTestNotification({
        email: testEmail.trim(),
        title: title.trim(),
        body: body.trim(),
        link: link.trim() || null,
      });
      if (res.sent > 0) {
        setOk(
          `Test gönderildi — ${res.email} hesabının ${res.sent}/${res.deviceCount} cihazına iletildi.`,
        );
      } else if (!res.fcmEnabled) {
        setError("Sunucuda FCM kapalı görünüyor — test iletilemedi.");
      } else {
        setError(
          `${res.deviceCount} cihaz bulundu ama FCM iletemedi (token bayat olabilir). Telefonda uygulamayı bir kez açıp tekrar dene.`,
        );
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Test bildirimi gönderilemedi.",
      );
    } finally {
      setTestSending(false);
    }
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Bildirim Gönder</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Habere bağlı olmadan, seçtiğin platform ve dildeki tüm cihazlara push
            gönderir. Gönderim arka planda garantili yapılır (hata olsa tekrar
            dener).
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}

      <div className="card card-pad">
        <div className="field">
          <label className="label">
            Başlık <span className="req">*</span>
          </label>
          <input
            className="input"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bildirim başlığı"
          />
        </div>

        <div className="field">
          <label className="label">
            Metin <span className="req">*</span>
          </label>
          <textarea
            className="textarea"
            value={body}
            maxLength={1000}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Bildirim metni"
          />
          <div className="hint">{body.length}/1000</div>
        </div>

        <div className="field">
          <label className="label">Bağlantı (opsiyonel)</label>
          <input
            className="input"
            value={link}
            maxLength={1000}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://scorestv.com/haber/... veya /rankings"
          />
          <div className="hint">
            Doldurulursa dokununca açılır. Boş bırakılırsa sadece uygulama açılır.
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label className="label">Platform</label>
            <select
              className="select"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as BroadcastPlatform)}
            >
              <option value="ALL">Hepsi (iOS + Android)</option>
              <option value="IOS">Sadece iOS</option>
              <option value="ANDROID">Sadece Android</option>
            </select>
          </div>
          <div className="field">
            <label className="label">Dil</label>
            <select
              className="select"
              value={lang}
              onChange={(e) => setLang(e.target.value as BroadcastLang)}
            >
              <option value="ALL">Tüm diller</option>
              <option value="TR">Türkçe</option>
              <option value="EN">İngilizce</option>
            </select>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={send}
          disabled={sending}
          style={{ marginTop: 4 }}
        >
          {sending ? "Gönderiliyor…" : "Bildirimi Gönder"}
        </button>

        <div
          className="field"
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: "1px solid var(--border)",
          }}
        >
          <label className="label">Sadece bana test gönder</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="input"
              style={{ flex: 1, minWidth: 220 }}
              type="email"
              value={testEmail}
              maxLength={320}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="e-posta (uygulamada giriş yaptığın hesap)"
            />
            <button
              className="btn btn-ghost"
              onClick={sendTest}
              disabled={testSending}
            >
              {testSending ? "Gönderiliyor…" : "Test Gönder"}
            </button>
          </div>
          <div className="hint">
            Yukarıdaki başlık/metin/bağlantıyı kullanır. Yalnızca bu hesapla mobil
            uygulamada giriş yapmış cihazlara gider — herkese GİTMEZ. (Telefonda o
            hesapla giriş yapıp bildirim izni verilmiş olmalı.)
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title">Gönderim Geçmişi</div>
        {history.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Henüz bildirim gönderilmedi.
          </div>
        ) : (
          <div className="bc-history">
            {history.map((h) => (
              <div className="bc-row" key={h.id}>
                <div className="bc-main">
                  <div className="bc-title">{h.title}</div>
                  <div className="bc-body">{h.body}</div>
                  {h.link && <div className="bc-link">{h.link}</div>}
                </div>
                <div className="bc-meta">
                  <div className="bc-badges">
                    <span
                      className={`bc-badge bc-status bc-status-${h.status.toLowerCase()}`}
                    >
                      {STATUS_TR[h.status]}
                    </span>
                    <span className="bc-badge">{PLATFORM_TR[h.platformTarget]}</span>
                    <span className="bc-badge">{LANG_TR[h.langTarget]}</span>
                  </div>
                  <div className="bc-count">
                    {h.status === "QUEUED"
                      ? `~${h.recipientCount} cihaz`
                      : `${h.sentCount} / ${h.recipientCount} cihaz`}
                  </div>
                  <div className="bc-date">
                    {new Date(h.createdAt).toLocaleString("tr-TR")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
