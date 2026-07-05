"use client";

import { useEffect, useState } from "react";
import NewsForm, {
  EMPTY_INITIAL,
  initialFromDetail,
  type NewsFormInitial,
} from "./NewsForm";
import { apiGetNews, ApiError } from "@/lib/api-client";

export default function NewNewsClient({ copyFrom }: { copyFrom: number | null }) {
  const [initial, setInitial] = useState<NewsFormInitial | null>(
    copyFrom ? null : EMPTY_INITIAL,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!copyFrom) return;
    let alive = true;
    (async () => {
      try {
        const d = await apiGetNews(copyFrom);
        if (alive) setInitial(initialFromDetail(d, true));
      } catch (err) {
        if (alive) {
          setError(err instanceof ApiError ? err.message : "Kaynak haber yüklenemedi.");
          setInitial(EMPTY_INITIAL);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [copyFrom]);

  if (!initial) {
    return (
      <div className="state-box">
        <div className="spinner" />
        <div className="mt-3">Kopyalanacak haber yükleniyor...</div>
      </div>
    );
  }

  return (
    <>
      {error && <div className="alert alert-error">{error}</div>}
      <NewsForm initial={initial} />
    </>
  );
}
