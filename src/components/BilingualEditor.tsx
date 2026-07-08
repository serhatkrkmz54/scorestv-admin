"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NewsForm, { initialFromDetail, type NewsFormHandle } from "./NewsForm";
import type { NewsDetail } from "@/lib/types";

/**
 * Çift-dil (TR + EN) yan yana düzenleme. Her taraf tam bir NewsForm (gömülü mod);
 * kendi Kaydet/Yayınla düğmeleri var. Üstteki "İkisini de Kaydet/Yayınla" her iki
 * paneli sırayla işler (her biri kendi bildirim ayarını kullanır).
 */
export default function BilingualEditor({ group }: { group: NewsDetail[] }) {
  const router = useRouter();
  const trRef = useRef<NewsFormHandle>(null);
  const enRef = useRef<NewsFormHandle>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const tr = group.find((g) => g.lang === "tr") ?? null;
  const en = group.find((g) => g.lang === "en") ?? null;

  async function bothSave(publish: boolean) {
    setBusy(true);
    setMsg(null);
    let total = 0;
    let okCount = 0;
    // Sırayla — eşzamanlı iki refresh/yarış olmasın.
    if (tr) {
      total++;
      if (await trRef.current?.save(publish)) okCount++;
    }
    if (en) {
      total++;
      if (await enRef.current?.save(publish)) okCount++;
    }
    setBusy(false);
    if (okCount === total) {
      setMsg(
        publish
          ? "İkisi de kaydedildi ve yayınlandı."
          : "İkisi de kaydedildi.",
      );
    } else {
      setMsg(`${okCount}/${total} işlendi — hatalı tarafı kontrol edin.`);
    }
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Çift Dil Düzenleme</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            İki dili yan yana düzenle. Her tarafın kendi Kaydet/Yayınla düğmeleri
            var; aşağıdan/üstten ikisini birden de işleyebilirsin.
          </div>
        </div>
        <div className="row">
          <button
            className="btn btn-primary"
            onClick={() => bothSave(false)}
            disabled={busy}
          >
            {busy ? "İşleniyor…" : "İkisini de Kaydet"}
          </button>
          <button
            className="btn btn-success"
            onClick={() => bothSave(true)}
            disabled={busy}
          >
            {busy ? "İşleniyor…" : "İkisini de Yayınla"}
          </button>
          <button className="btn" onClick={() => router.push("/")} disabled={busy}>
            Listeye Dön
          </button>
        </div>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

      {!tr && !en ? (
        <div className="alert alert-error">
          Bu haberin dil eşleri bulunamadı.
        </div>
      ) : (
        <div className="bilingual-grid">
          <div className="bilingual-pane">
            {tr ? (
              <NewsForm
                ref={trRef}
                embedded
                paneTitle="Türkçe"
                initial={initialFromDetail(tr)}
              />
            ) : (
              <div className="muted" style={{ padding: 20 }}>
                Türkçe sürüm yok.
              </div>
            )}
          </div>
          <div className="bilingual-pane">
            {en ? (
              <NewsForm
                ref={enRef}
                embedded
                paneTitle="İngilizce"
                initial={initialFromDetail(en)}
              />
            ) : (
              <div className="muted" style={{ padding: 20 }}>
                İngilizce sürüm yok.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
