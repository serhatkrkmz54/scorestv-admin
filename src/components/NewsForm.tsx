"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RichEditor from "./RichEditor";
import EntityLinker from "./EntityLinker";
import CoverUploader from "./CoverUploader";
import {
  apiCreateNews,
  apiUpdateNews,
  apiPublishNews,
  ApiError,
} from "@/lib/api-client";
import type {
  EntityChip,
  NewsCategory,
  NewsDetail,
  NewsRequest,
  NewsStatus,
} from "@/lib/types";
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  SPORT_OPTIONS,
  STATUS_LABELS,
} from "@/lib/labels";
import { isoToLocalInput, localInputToIso } from "@/lib/format";

// Bildirim hedefi — UI durumu. NOT: Backend CreateNewsRequest/UpdateNewsRequest
// DTO'sunda bildirim alanı YOKTUR; bu değerler İSTEĞE EKLENMEZ (400 önlemek
// için). Sadece arayüzde tutulur; backend bildirim alanlarını kabul edecek
// şekilde genişletildiğinde bağlanacaktır.
type NotifyTarget = "ALL" | "FAVORITES";

export interface NewsFormInitial {
  id?: number;
  lang: "tr" | "en";
  translationGroupId: number | null;
  title: string;
  summary: string;
  body: string;
  coverImageKey: string | null;
  coverImageUrl: string | null;
  category: NewsCategory | "";
  sport: string;
  isBreaking: boolean;
  isFeatured: boolean;
  status: NewsStatus;
  publishedAt: string | null;
  source: string;
  sourceUrl: string;
  chips: EntityChip[];
}

export const EMPTY_INITIAL: NewsFormInitial = {
  lang: "tr",
  translationGroupId: null,
  title: "",
  summary: "",
  body: "",
  coverImageKey: null,
  coverImageUrl: null,
  category: "",
  sport: "football",
  isBreaking: false,
  isFeatured: false,
  status: "DRAFT",
  publishedAt: null,
  source: "MANUAL",
  sourceUrl: "",
  chips: [],
};

/** NewsDetail → form başlangıç değerleri (düzenleme + kopyalama). */
export function initialFromDetail(d: NewsDetail, forCopy = false): NewsFormInitial {
  const chips: EntityChip[] = [
    ...d.teams.map((e) => ({ kind: "team" as const, id: e.id, name: e.name, logo: e.logo })),
    ...d.leagues.map((e) => ({ kind: "league" as const, id: e.id, name: e.name, logo: e.logo })),
    ...d.players.map((e) => ({ kind: "player" as const, id: e.id, name: e.name, logo: e.logo })),
    ...d.countries.map((e) => ({ kind: "country" as const, id: e.id, name: e.name, logo: e.logo })),
  ];
  return {
    id: forCopy ? undefined : d.id,
    lang: (d.lang === "en" ? "en" : "tr"),
    translationGroupId: forCopy ? null : d.translationGroupId,
    title: forCopy ? `${d.title} (kopya)` : d.title,
    summary: d.summary ?? "",
    body: d.body ?? "",
    coverImageKey: null, // detay yalnızca URL döner; key yeniden yüklemede belirlenir
    coverImageUrl: forCopy ? null : d.coverImageUrl,
    category: d.category ?? "",
    sport: d.sport ?? "football",
    isBreaking: d.isBreaking,
    isFeatured: d.isFeatured,
    status: forCopy ? "DRAFT" : d.status,
    publishedAt: forCopy ? null : d.publishedAt,
    source: d.source ?? "MANUAL",
    sourceUrl: d.sourceUrl ?? "",
    chips,
  };
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      <div>
        <div className="t-label">{label}</div>
        {hint && <div className="t-hint">{hint}</div>}
      </div>
      <label className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="slider" />
      </label>
    </div>
  );
}

export default function NewsForm({ initial }: { initial: NewsFormInitial }) {
  const router = useRouter();
  const isEdit = initial.id !== undefined;

  const [lang, setLang] = useState<"tr" | "en">(initial.lang);
  const [translationGroupId, setTranslationGroupId] = useState<string>(
    initial.translationGroupId != null ? String(initial.translationGroupId) : "",
  );
  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary);
  const [body, setBody] = useState(initial.body);
  const [coverKey, setCoverKey] = useState<string | null>(initial.coverImageKey);
  const [coverUrl, setCoverUrl] = useState<string | null>(initial.coverImageUrl);
  const [category, setCategory] = useState<NewsCategory | "">(initial.category);
  const [sport, setSport] = useState(initial.sport);
  const [isBreaking, setIsBreaking] = useState(initial.isBreaking);
  const [isFeatured, setIsFeatured] = useState(initial.isFeatured);
  const [status, setStatus] = useState<NewsStatus>(initial.status);
  const [publishedAtLocal, setPublishedAtLocal] = useState(
    isoToLocalInput(initial.publishedAt),
  );
  const [source, setSource] = useState(initial.source);
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl);
  const [chips, setChips] = useState<EntityChip[]>(initial.chips);

  // Bildirim (UI-only — bkz. üstteki not).
  const [notifyTarget, setNotifyTarget] = useState<NotifyTarget>("ALL");
  const [notifyOnPublish, setNotifyOnPublish] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ok, setOk] = useState<string | null>(null);

  const ids = useMemo(() => {
    const teamIds: number[] = [];
    const leagueIds: number[] = [];
    const countryIds: number[] = [];
    const playerIds: number[] = [];
    for (const c of chips) {
      if (c.kind === "team") teamIds.push(c.id);
      else if (c.kind === "league") leagueIds.push(c.id);
      else if (c.kind === "country") countryIds.push(c.id);
      else if (c.kind === "player") playerIds.push(c.id);
    }
    return { teamIds, leagueIds, countryIds, playerIds };
  }, [chips]);

  function buildRequest(): NewsRequest {
    return {
      lang,
      translationGroupId: translationGroupId.trim()
        ? Number(translationGroupId.trim())
        : null,
      title: title.trim(),
      summary: summary.trim() || null,
      body,
      coverImageKey: coverKey ?? null,
      category: category || null,
      sport: sport || null,
      isBreaking,
      isFeatured,
      status,
      // publishedAt yalnız SCHEDULED (veya PUBLISHED elle tarih) için gönderilir.
      publishedAt:
        status === "SCHEDULED" && publishedAtLocal
          ? localInputToIso(publishedAtLocal)
          : status === "PUBLISHED" && publishedAtLocal
            ? localInputToIso(publishedAtLocal)
            : null,
      source: source.trim() || null,
      sourceUrl: sourceUrl.trim() || null,
      teamIds: ids.teamIds,
      leagueIds: ids.leagueIds,
      countryIds: ids.countryIds,
      playerIds: ids.playerIds,
      // Bildirim: yalnız "yayınlarken gönder" işaretliyse backend push atar.
      // Push, haber PUBLISHED'a geçtiğinde (kaydet+yayınla ya da /publish) tetiklenir.
      sendPush: notifyOnPublish,
      pushTarget: notifyTarget,
    };
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Başlık zorunludur.";
    if (title.trim().length > 255) errs.title = "Başlık 255 karakteri aşamaz.";
    if (summary.trim().length > 600) errs.summary = "Özet 600 karakteri aşamaz.";
    // TipTap boş içerikte "<p></p>" üretebilir — anlamlı metin kontrolü.
    const bodyText = body.replace(/<[^>]*>/g, "").trim();
    if (!bodyText) errs.body = "İçerik boş olamaz.";
    if (status === "SCHEDULED" && !publishedAtLocal)
      errs.publishedAt = "Zamanlanmış haber için yayın tarihi zorunludur.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function save(publishAfter: boolean) {
    setError(null);
    setOk(null);
    if (!validate()) {
      setError("Lütfen işaretli alanları düzeltin.");
      return;
    }
    setSaving(true);
    try {
      const req = buildRequest();
      let saved: NewsDetail;
      if (isEdit) {
        saved = await apiUpdateNews(initial.id!, req);
      } else {
        saved = await apiCreateNews(req);
      }
      if (publishAfter && saved.status !== "PUBLISHED") {
        saved = await apiPublishNews(saved.id);
      }
      setOk(publishAfter ? "Haber kaydedildi ve yayınlandı." : "Haber kaydedildi.");
      // Yeni oluşturmada düzenleme sayfasına geç.
      if (!isEdit) {
        router.replace(`/news/${saved.id}/edit`);
      }
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) setFieldErrors((prev) => ({ ...prev, ...err.errors }));
      } else {
        setError("Kaydedilemedi. Bağlantınızı kontrol edin.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            {isEdit ? "Haberi Düzenle" : "Yeni Haber"}
          </h2>
          <div className="muted" style={{ fontSize: 13 }}>
            {isEdit ? `#${initial.id}` : "Taslak olarak başlar"}
          </div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => router.push("/")} disabled={saving}>
            Listeye Dön
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}

      <div className="form-grid">
        {/* ---- Sol: içerik ---- */}
        <div className="stack">
          <div className="card card-pad">
            <div className="field">
              <label className="label">
                Başlık <span className="req">*</span>
              </label>
              <input
                className="input"
                value={title}
                maxLength={255}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Haber başlığı"
              />
              {fieldErrors.title && <div className="field-error">{fieldErrors.title}</div>}
            </div>

            <div className="field">
              <label className="label">Özet</label>
              <textarea
                className="textarea"
                value={summary}
                maxLength={600}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Kısa özet (liste ve önizlemede görünür)"
              />
              <div className="hint">{summary.length}/600</div>
              {fieldErrors.summary && <div className="field-error">{fieldErrors.summary}</div>}
            </div>

            <div className="field">
              <label className="label">
                İçerik <span className="req">*</span>
              </label>
              <RichEditor value={body} onChange={setBody} />
              {fieldErrors.body && <div className="field-error">{fieldErrors.body}</div>}
            </div>
          </div>

          <div className="card card-pad">
            <div className="section-title">Bağlı Varlıklar</div>
            <div className="section-hint">
              Bu haberle ilişkili takım, lig, oyuncu ve ülkeleri ekleyin. Haber, ilgili
              varlık sayfalarında listelenir.
            </div>
            <EntityLinker value={chips} onChange={setChips} />
          </div>
        </div>

        {/* ---- Sağ: yayın ayarları ---- */}
        <div className="stack">
          <div className="card card-pad">
            <div className="section-title">Yayın Durumu</div>
            <div className="field">
              <label className="label">Durum</label>
              <select
                className="select"
                value={status}
                onChange={(e) => setStatus(e.target.value as NewsStatus)}
              >
                {(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"] as NewsStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            {(status === "SCHEDULED" || status === "PUBLISHED") && (
              <div className="field">
                <label className="label">
                  Yayın Tarihi {status === "SCHEDULED" && <span className="req">*</span>}
                </label>
                <input
                  type="datetime-local"
                  className="input"
                  value={publishedAtLocal}
                  onChange={(e) => setPublishedAtLocal(e.target.value)}
                />
                <div className="hint">
                  {status === "SCHEDULED"
                    ? "Bu tarihte otomatik yayınlanır."
                    : "Boş bırakılırsa yayınlandığında ayarlanır."}
                </div>
                {fieldErrors.publishedAt && (
                  <div className="field-error">{fieldErrors.publishedAt}</div>
                )}
              </div>
            )}
          </div>

          <div className="card card-pad">
            <div className="section-title">Sınıflandırma</div>
            <div className="field">
              <label className="label">Dil</label>
              <select
                className="select"
                value={lang}
                onChange={(e) => setLang(e.target.value as "tr" | "en")}
              >
                <option value="tr">Türkçe (TR)</option>
                <option value="en">İngilizce (EN)</option>
              </select>
            </div>

            <div className="field">
              <label className="label">Kategori</label>
              <select
                className="select"
                value={category}
                onChange={(e) => setCategory(e.target.value as NewsCategory | "")}
              >
                <option value="">Seçilmedi</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label">Spor</label>
              <select className="select" value={sport} onChange={(e) => setSport(e.target.value)}>
                {SPORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label">Çeviri Grubu ID</label>
              <input
                className="input"
                type="number"
                value={translationGroupId}
                onChange={(e) => setTranslationGroupId(e.target.value)}
                placeholder="Bu haberin diğer dildeki eşinin ID'si (opsiyonel)"
              />
              <div className="hint">
                Aynı haberin TR/EN sürümlerini birbirine bağlar. Boş bırakılabilir.
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <div className="section-title">Kapak Görseli</div>
            <CoverUploader
              coverKey={coverKey}
              previewUrl={coverUrl}
              onChange={(k, u) => {
                setCoverKey(k);
                setCoverUrl(u);
              }}
            />
          </div>

          <div className="card card-pad">
            <div className="section-title">Etiketler</div>
            <Toggle
              label="Son Dakika"
              hint="Öne çıkan son dakika bandı"
              checked={isBreaking}
              onChange={setIsBreaking}
            />
            <Toggle
              label="Öne Çıkan"
              hint="Ana sayfada öne çıkarılır"
              checked={isFeatured}
              onChange={setIsFeatured}
            />
          </div>

          <div className="card card-pad">
            <div className="section-title">Kaynak</div>
            <div className="field">
              <label className="label">Kaynak</label>
              <input
                className="input"
                value={source}
                maxLength={64}
                onChange={(e) => setSource(e.target.value)}
                placeholder="MANUAL"
              />
              <div className="hint">Elle girilen haberlerde varsayılan MANUAL.</div>
            </div>
            <div className="field">
              <label className="label">Kaynak URL</label>
              <input
                className="input"
                value={sourceUrl}
                maxLength={1024}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="card card-pad">
            <div className="section-title">Bildirim</div>
            <div className="section-hint">
              &quot;Yayınlarken bildirim gönder&quot; işaretliyse, haber yayınlandığında
              seçtiğin hedefe push gönderilir. Her haber en fazla bir kez bildirilir.
            </div>
            <label className="label">Hedef</label>
            <div className="radio-row mb-3">
              <label
                className={`radio-opt ${notifyTarget === "ALL" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="notify-target"
                  checked={notifyTarget === "ALL"}
                  onChange={() => setNotifyTarget("ALL")}
                />
                Herkes
              </label>
              <label
                className={`radio-opt ${notifyTarget === "FAVORITES" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="notify-target"
                  checked={notifyTarget === "FAVORITES"}
                  onChange={() => setNotifyTarget("FAVORITES")}
                />
                İlgili favoriler
              </label>
            </div>
            <label className="check-row" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={notifyOnPublish}
                onChange={(e) => setNotifyOnPublish(e.target.checked)}
              />
              Yayınlarken bildirim gönder
            </label>
          </div>
        </div>
      </div>

      <div className="form-actions">
        {isEdit && (
          <button
            className="btn"
            onClick={() => router.push(`/news/${initial.id}/preview`)}
            disabled={saving}
          >
            Önizle
          </button>
        )}
        <button className="btn btn-primary" onClick={() => save(false)} disabled={saving}>
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <button className="btn btn-success" onClick={() => save(true)} disabled={saving}>
          {saving ? "İşleniyor..." : "Kaydet & Yayınla"}
        </button>
      </div>
    </div>
  );
}
