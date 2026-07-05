import type { NewsDetail } from "@/lib/types";
import { categoryLabel, sportLabel, LANG_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import StatusBadge from "./StatusBadge";

/**
 * Haberin yayın görünümü — salt-okunur. body sunucuda sanitize edilmiş HTML
 * olduğu için dangerouslySetInnerHTML güvenlidir (backend NewsSanitizer).
 */
export default function ArticlePreview({ detail: d }: { detail: NewsDetail }) {
  return (
    <article className="article-render">
      <div className="row mb-3" style={{ gap: 8, flexWrap: "wrap" }}>
        <StatusBadge status={d.status} />
        <span className="badge badge-lang">
          {LANG_LABELS[d.lang] ?? d.lang.toUpperCase()}
        </span>
        {d.category && <span className="badge badge-draft">{categoryLabel(d.category)}</span>}
        {d.sport && <span className="badge badge-draft">{sportLabel(d.sport)}</span>}
        {d.isBreaking && <span className="badge badge-flag">SON DAKİKA</span>}
        {d.isFeatured && <span className="badge badge-scheduled">Öne Çıkan</span>}
      </div>

      <h1>{d.title}</h1>

      <div className="meta">
        {d.authorName ? `${d.authorName} · ` : ""}
        {formatDate(d.publishedAt)}
        {d.readingMinutes ? ` · ${d.readingMinutes} dk okuma` : ""}
        {` · ${d.viewCount} görüntülenme`}
      </div>

      {d.summary && <p className="summary">{d.summary}</p>}

      {d.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="cover" src={d.coverImageUrl} alt={d.title} />
      )}

      <div
        className="article-body"
        // body backend'de sanitize edilmiştir.
        dangerouslySetInnerHTML={{ __html: d.body }}
      />

      {(d.teams.length > 0 ||
        d.leagues.length > 0 ||
        d.players.length > 0 ||
        d.countries.length > 0) && (
        <div className="mt-3">
          <div className="section-title">Bağlı Varlıklar</div>
          <div className="chips">
            {[...d.teams, ...d.leagues, ...d.players, ...d.countries].map((e, i) => (
              <span className="chip" key={`${e.id}-${i}`}>
                {e.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.logo} alt="" />
                ) : null}
                <span>{e.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
