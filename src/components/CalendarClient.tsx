"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  CalendarClock,
  Send,
  ExternalLink,
  Globe,
} from "lucide-react";
import { apiListNews, apiReschedule, apiIndexNow, ApiError } from "@/lib/api-client";
import type { NewsListItem, NewsStatus } from "@/lib/types";
import { isoToLocalInput, localInputToIso, formatDate } from "@/lib/format";

const WEB_BASE = process.env.NEXT_PUBLIC_WEB_URL || "https://scorestv.com";
const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

type CalItem = NewsListItem & { status: NewsStatus };

function dayKey(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function liveUrl(a: { lang: string; slug: string }): string {
  return `${WEB_BASE}/${a.lang === "en" ? "news" : "haber"}/${a.slug}`;
}

export default function CalendarClient() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [items, setItems] = useState<CalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<CalItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sch, pub] = await Promise.all([
        apiListNews({ status: "SCHEDULED", size: 100 }),
        apiListNews({ status: "PUBLISHED", size: 200 }),
      ]);
      const all: CalItem[] = [
        ...sch.items.map((i) => ({ ...i, status: "SCHEDULED" as NewsStatus })),
        ...pub.items.map((i) => ({ ...i, status: "PUBLISHED" as NewsStatus })),
      ];
      setItems(all);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Takvim alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byDay = useMemo(() => {
    const m = new Map<string, CalItem[]>();
    for (const it of items) {
      const k = dayKey(it.publishedAt);
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return m;
  }, [items]);

  // Ay ızgarası (Pazartesi başlangıç)
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // Pzt=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  function prevMonth() {
    setSelectedDay(null);
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    setSelectedDay(null);
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const dayItems = selectedDay ? byDay.get(selectedDay) ?? [] : [];

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Yayın Takvimi</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Zamanlanmış ve yayınlanan haberler
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-icon" onClick={prevMonth} title="Önceki ay" aria-label="Önceki ay">
            <ChevronLeft size={16} />
          </button>
          <div style={{ minWidth: 130, textAlign: "center", fontWeight: 700 }}>
            {MONTHS[month]} {year}
          </div>
          <button className="btn btn-icon" onClick={nextMonth} title="Sonraki ay" aria-label="Sonraki ay">
            <ChevronRight size={16} />
          </button>
          <button className="btn" onClick={() => load()} disabled={loading}>
            <RefreshCw size={16} /> Yenile
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card card-pad">
        <div className="cal-grid cal-head">
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal-weekday">{w}</div>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} className="cal-cell cal-empty" />;
            const k = `${year}-${month}-${d}`;
            const dayList = byDay.get(k) ?? [];
            const sch = dayList.filter((x) => x.status === "SCHEDULED").length;
            const pub = dayList.length - sch;
            return (
              <button
                key={i}
                className={`cal-cell ${k === todayKey ? "cal-today" : ""} ${
                  selectedDay === k ? "cal-selected" : ""
                }`}
                onClick={() => setSelectedDay(k)}
              >
                <span className="cal-num">{d}</span>
                {dayList.length > 0 && (
                  <span className="cal-dots">
                    {pub > 0 && <span className="cal-dot pub" title={`${pub} yayında`}>{pub}</span>}
                    {sch > 0 && <span className="cal-dot sch" title={`${sch} zamanlanmış`}>{sch}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="card card-pad">
          <div className="dash-head">
            <CalendarClock size={16} />
            <span>{dayItems.length} haber</span>
          </div>
          {dayItems.length === 0 ? (
            <div className="muted">Bu gün için haber yok.</div>
          ) : (
            <ul className="cand-list">
              {dayItems.map((it) => (
                <li key={`${it.id}-${it.status}`} className="cand-item">
                  <span
                    className={`badge ${
                      it.status === "SCHEDULED" ? "badge-scheduled" : "badge-published"
                    }`}
                  >
                    {it.status === "SCHEDULED" ? "Zamanlanmış" : "Yayında"}
                  </span>
                  <div className="slider-main">
                    <div className="slider-title">{it.title}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {formatDate(it.publishedAt)}
                    </div>
                  </div>
                  <button className="btn btn-sm" onClick={() => setSelected(it)}>
                    Detay
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selected && (
        <DetailDrawer
          item={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function DetailDrawer({
  item,
  onClose,
  onSaved,
}: {
  item: CalItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [when, setWhen] = useState(isoToLocalInput(item.publishedAt));
  const [busy, setBusy] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const url = liveUrl(item);

  async function reschedule() {
    const iso = localInputToIso(when);
    if (!iso) {
      setMsg("Geçerli bir tarih seçin.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await apiReschedule(item.id, { publishedAt: iso });
      onSaved();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Yeniden zamanlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function ping() {
    setPinging(true);
    setMsg(null);
    try {
      const r = await apiIndexNow(item.id);
      setMsg(`IndexNow'a bildirildi: ${r.url}`);
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "IndexNow başarısız.");
    } finally {
      setPinging(false);
    }
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <strong>Haber Detayı</strong>
          <button className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Kapat">
            <X size={16} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Google önizleme */}
          <div className="seo-label">Google önizleme</div>
          <div className="seo-google">
            <div className="seo-url">{url}</div>
            <div className="seo-gtitle">{item.title}</div>
            <div className="seo-desc">
              {item.summary || "Özet yok — SEO için özet eklemeniz önerilir."}
            </div>
          </div>

          {/* Sosyal önizleme */}
          <div className="seo-label">Sosyal paylaşım kartı</div>
          <div className="seo-social">
            {item.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="seo-cover" src={item.coverImageUrl} alt="" />
            ) : (
              <div className="seo-cover seo-cover-empty">Kapak görseli yok</div>
            )}
            <div className="seo-social-body">
              <div className="seo-social-host">{WEB_BASE.replace(/^https?:\/\//, "")}</div>
              <div className="seo-stitle">{item.title}</div>
              {item.summary && <div className="seo-desc">{item.summary}</div>}
            </div>
          </div>

          {/* Yeniden zamanla */}
          <div className="seo-label">Yeniden zamanla</div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <input
              type="datetime-local"
              className="input"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              style={{ maxWidth: 220 }}
            />
            <button className="btn btn-primary" onClick={reschedule} disabled={busy}>
              <CalendarClock size={15} /> {busy ? "..." : "Uygula"}
            </button>
          </div>

          {/* Aksiyonlar */}
          <div className="drawer-actions">
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn">
              <ExternalLink size={15} /> Habere git
            </a>
            <Link href={`/news/${item.id}/edit`} className="btn">
              Düzenle
            </Link>
            {item.status === "PUBLISHED" && (
              <button className="btn btn-success" onClick={ping} disabled={pinging}>
                <Globe size={15} /> {pinging ? "..." : "IndexNow'a bildir"}
              </button>
            )}
          </div>

          {msg && <div className="seo-msg">{msg}</div>}
        </div>
      </div>
    </div>
  );
}
