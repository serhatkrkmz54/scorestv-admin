"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutTemplate,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  Search,
  Save,
  RefreshCw,
} from "lucide-react";
import {
  apiGetSlider,
  apiSaveSlider,
  apiListNews,
  ApiError,
} from "@/lib/api-client";
import type { NewsListItem } from "@/lib/types";

export default function SliderClient() {
  const [lang, setLang] = useState("tr");
  const [items, setItems] = useState<NewsListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [candidates, setCandidates] = useState<NewsListItem[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await apiGetSlider(lang));
      setDirty(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Slider alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const inSliderIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  useEffect(() => {
    let alive = true;
    async function search() {
      setSearching(true);
      try {
        const res = await apiListNews({
          status: "PUBLISHED",
          lang,
          q: debouncedQ || undefined,
          size: 20,
        });
        if (alive) setCandidates(res.items);
      } catch {
        if (alive) setCandidates([]);
      } finally {
        if (alive) setSearching(false);
      }
    }
    void search();
    return () => {
      alive = false;
    };
  }, [lang, debouncedQ]);

  function move(index: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
    setDirty(true);
  }

  function remove(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDirty(true);
  }

  function add(item: NewsListItem) {
    if (inSliderIds.has(item.id)) return;
    setItems((prev) => [...prev, item]);
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const saved = await apiSaveSlider({ lang, ids: items.map((i) => i.id) });
      setItems(saved);
      setDirty(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  const available = candidates.filter((c) => !inSliderIds.has(c.id));

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Ana Sayfa Slider</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Web ana sayfa slider'ında gösterilecek haberler ve sırası
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <select className="select" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="tr">🇹🇷 Türkçe</option>
            <option value="en">🇬🇧 İngilizce</option>
          </select>
          <button className="btn" onClick={() => load()} disabled={loading || saving}>
            <RefreshCw size={16} /> Yenile
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!dirty || saving}>
            <Save size={16} /> {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="dash-2col">
        {/* Slider'daki haberler */}
        <div className="card card-pad">
          <div className="dash-head">
            <LayoutTemplate size={16} />
            <span>Slider ({items.length})</span>
          </div>
          {loading ? (
            <div className="state-box">
              <div className="spinner" />
            </div>
          ) : items.length === 0 ? (
            <div className="muted" style={{ padding: "12px 0" }}>
              Slider boş. Sağdan haber ekleyin.
            </div>
          ) : (
            <ol className="slider-list">
              {items.map((it, i) => (
                <li key={it.id} className="slider-item">
                  <span className="slider-rank">{i + 1}</span>
                  {it.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="slider-thumb" src={it.coverImageUrl} alt="" />
                  ) : (
                    <div className="slider-thumb slider-thumb-empty">yok</div>
                  )}
                  <div className="slider-main">
                    <div className="slider-title">{it.title}</div>
                  </div>
                  <div className="slider-ctl">
                    <button
                      className="btn btn-icon btn-ghost"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      title="Yukarı"
                      aria-label="Yukarı"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      className="btn btn-icon btn-ghost"
                      onClick={() => move(i, 1)}
                      disabled={i === items.length - 1}
                      title="Aşağı"
                      aria-label="Aşağı"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      className="btn btn-icon btn-danger"
                      onClick={() => remove(it.id)}
                      title="Çıkar"
                      aria-label="Çıkar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Eklenebilir yayında haberler */}
        <div className="card card-pad">
          <div className="dash-head">
            <Plus size={16} />
            <span>Haber Ekle</span>
          </div>
          <div className="search-wrap" style={{ marginBottom: 12 }}>
            <Search size={15} className="search-icon" />
            <input
              className="input search-input"
              placeholder="Yayındaki haberlerde ara..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {searching ? (
            <div className="muted" style={{ padding: "8px 0" }}>Aranıyor...</div>
          ) : available.length === 0 ? (
            <div className="muted" style={{ padding: "8px 0" }}>
              Eklenecek haber yok.
            </div>
          ) : (
            <ul className="cand-list">
              {available.map((c) => (
                <li key={c.id} className="cand-item">
                  {c.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="slider-thumb" src={c.coverImageUrl} alt="" />
                  ) : (
                    <div className="slider-thumb slider-thumb-empty">yok</div>
                  )}
                  <div className="slider-main">
                    <div className="slider-title">{c.title}</div>
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => add(c)}
                    title="Slider'a ekle"
                  >
                    <Plus size={14} /> Ekle
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
