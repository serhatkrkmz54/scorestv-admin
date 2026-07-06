"use client";

import { useMemo, useState } from "react";
import type { EntityChip, NewsCategory } from "@/lib/types";
import { categoryLabel } from "@/lib/labels";

/**
 * Editör içinde CANLI önizleme — form durumundan (kayıt gerektirmez) haberin
 * yayın görünümünü web ve mobil çerçevede gösterir. Yazdıkça güncellenir.
 *
 * İçerik, gerçek yayın stiliyle aynı sınıfları (.article-render/.article-body)
 * kullanır; sadece çerçeve genişliği (web ~820 / mobil telefon ~390) değişir.
 * Kağıt beyaz + koyu metin — panel teması ne olursa olsun yayınlanan makale
 * gibi görünür.
 */
interface Props {
  title: string;
  summary: string;
  bodyHtml: string;
  coverUrl: string | null;
  category: NewsCategory | "";
  isBreaking: boolean;
  lang: "tr" | "en";
  chips: EntityChip[];
}

type Device = "web" | "mobile";

/** Okuma süresi tahmini — HTML strip + ~200 kelime/dk. */
function readingMinutes(html: string): number {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return 0;
  return Math.max(1, Math.round(text.split(" ").length / 200));
}

export default function NewsLivePreview(props: Props) {
  const [device, setDevice] = useState<Device>("web");
  const isTr = props.lang === "tr";
  const mins = useMemo(() => readingMinutes(props.bodyHtml), [props.bodyHtml]);
  const read = mins > 0 ? (isTr ? `${mins} dk okuma` : `${mins} min read`) : "";
  const cat = props.category ? categoryLabel(props.category) : "";

  const bodyFallback = isTr ? "İçerik burada görünecek…" : "Body appears here…";

  const paper = (
    <div className="nlp-paper">
      <article className="article-render">
        {(props.isBreaking || cat) && (
          <div className="chips" style={{ marginBottom: 10 }}>
            {props.isBreaking && (
              <span className="badge badge-flag">
                {isTr ? "SON DAKİKA" : "BREAKING"}
              </span>
            )}
            {cat && <span className="badge badge-draft">{cat}</span>}
          </div>
        )}
        <h1>{props.title || (isTr ? "Başlık burada görünür…" : "Title appears here…")}</h1>
        {read && <div className="meta">{read}</div>}
        {props.summary && <p className="summary">{props.summary}</p>}
        {props.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="cover" src={props.coverUrl} alt="" />
        )}
        <div
          className="article-body"
          // İçerik editörün kendi HTML çıktısı (admin, kendi tarayıcısında).
          dangerouslySetInnerHTML={{
            __html:
              props.bodyHtml ||
              `<p style="opacity:.45">${bodyFallback}</p>`,
          }}
        />
        {props.chips.length > 0 && (
          <div className="chips" style={{ marginTop: 18 }}>
            {props.chips.map((c, i) => (
              <span className="chip" key={`${c.id}-${i}`}>
                {c.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.logo} alt="" />
                ) : null}
                <span>{c.name}</span>
              </span>
            ))}
          </div>
        )}
      </article>
    </div>
  );

  return (
    <div className="card card-pad">
      <div className="spread" style={{ marginBottom: 14 }}>
        <div className="section-title" style={{ margin: 0 }}>
          {isTr ? "Canlı Önizleme" : "Live Preview"}
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button
            type="button"
            className={device === "web" ? "btn btn-primary" : "btn"}
            onClick={() => setDevice("web")}
          >
            Web
          </button>
          <button
            type="button"
            className={device === "mobile" ? "btn btn-primary" : "btn"}
            onClick={() => setDevice("mobile")}
          >
            Mobil
          </button>
        </div>
      </div>
      <div className="nlp-stage">
        {device === "web" ? (
          <div className="nlp-web">{paper}</div>
        ) : (
          <div className="nlp-phone">
            <div className="nlp-phone-screen">{paper}</div>
          </div>
        )}
      </div>
    </div>
  );
}
