"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiTeleskorSikayetler,
  apiTeleskorMesajSil,
  apiTeleskorSikayetKapat,
  ApiError,
} from "@/lib/api-client";
import type { TeleskorSohbetSikayeti } from "@/lib/types";
import { formatDate } from "@/lib/format";
import TeleskorOnayModal from "./TeleskorOnayModal";

/**
 * SOHBET MODERASYONU — maç sohbetinde şikayet edilen mesajlar.
 *
 * <h3>İki farklı sonuç, iki farklı düğme</h3>
 * <ul>
 *   <li><b>Mesajı sil:</b> mesaj görünmez olur ve üstündeki BÜTÜN bekleyen
 *       şikayetler kapanır. Satır gerçekten silinmiyor
 *       ({@code deleted_at}) — şikayetin işaret ettiği içerik kanıt olarak
 *       durmalı.</li>
 *   <li><b>Şikayeti kapat:</b> mesaja DOKUNULMAZ, yalnız şikayet yersiz
 *       bulunmuş sayılır.</li>
 * </ul>
 * İkisi tek düğmeye indirilseydi "haklı şikayet" ile "asılsız ihbar"
 * ayrımı kaybolurdu.
 *
 * <h3>Aynı mesaj birden çok kez şikayet edilebilir</h3>
 * Liste ŞİKAYET başına satır gösteriyor, mesaj başına değil: kaç kişinin
 * şikayet ettiği bir bilgi. Aynı mesajın satırları gruplanıyor ki
 * yönetici aynı gövdeyi üst üste okumasın.
 */
export default function TeleskorSohbetClient() {
  const [satirlar, setSatirlar] = useState<TeleskorSohbetSikayeti[]>([]);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [onay, setOnay] = useState<{
    baslik: string;
    uyari: string;
    tehlikeli: boolean;
    onayMetni: string;
    calistir: () => Promise<void>;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSatirlar(await apiTeleskorSikayetler(100));
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Şikayetler alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // MESAJ BAŞINA GRUPLAMA: aynı mesajı beş kişi şikayet ettiyse gövdeyi
  // beş kez okumak gerekmesin. Sayı da bir bilgi — listede gösteriliyor.
  const gruplar = new Map<number, TeleskorSohbetSikayeti[]>();
  for (const s of satirlar) {
    const liste = gruplar.get(s.mesaj_id) ?? [];
    liste.push(s);
    gruplar.set(s.mesaj_id, liste);
  }

  function mesajSil(g: TeleskorSohbetSikayeti[]) {
    const ilk = g[0];
    setOnay({
      baslik: "Mesajı sil",
      uyari:
        `${ilk.yazar ?? "?"} kullanıcısının mesajı silinecek ve bu mesaja ` +
        `açılan ${g.length} şikayet kapanacak. Mesaj kullanıcılara ` +
        "görünmez olur; kayıt kanıt olarak veritabanında kalır.",
      tehlikeli: true,
      onayMetni: "Mesajı sil",
      calistir: async () => {
        await apiTeleskorMesajSil(ilk.mesaj_id);
        await load();
      },
    });
  }

  function sikayetKapat(s: TeleskorSohbetSikayeti) {
    setOnay({
      baslik: "Şikayeti kapat",
      uyari:
        "Şikayet yersiz bulunmuş sayılacak. Mesaja DOKUNULMAZ, yerinde " +
        "kalır ve kullanıcılara görünmeye devam eder.",
      tehlikeli: false,
      onayMetni: "Yersiz bul ve kapat",
      calistir: async () => {
        await apiTeleskorSikayetKapat(s.sikayet_id);
        await load();
      },
    });
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Teleskor — Sohbet Şikayetleri</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Maç sohbetinde kullanıcıların şikayet ettiği mesajlar. Bekleyen
            şikayetler burada; kapatılanlar listeden düşer.
          </div>
        </div>
        <button className="btn" onClick={load}>
          Yenile
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      <div className="card card-pad">
        {loading ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Yükleniyor…
          </div>
        ) : gruplar.size === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Bekleyen şikayet yok.
          </div>
        ) : (
          <div className="stack">
            {[...gruplar.values()].map((g) => (
              <SikayetKarti
                key={g[0].mesaj_id}
                grup={g}
                onSil={() => mesajSil(g)}
                onKapat={sikayetKapat}
              />
            ))}
          </div>
        )}
      </div>

      {onay && (
        <TeleskorOnayModal
          baslik={onay.baslik}
          uyari={onay.uyari}
          alanEtiketi="Not (isteğe bağlı — yalnız kendi kaydın için)"
          alanIpucu="Boş bırakabilirsin"
          // Teleskor bu iki uçta gerekçe İSTEMİYOR; alan zorunlu
          // yapılsaydı sunucunun sormadığı bir şeyi dayatmış olurduk.
          zorunlu={false}
          onayMetni={onay.onayMetni}
          tehlikeli={onay.tehlikeli}
          onKapat={() => setOnay(null)}
          onOnayla={async () => {
            await onay.calistir();
            setOnay(null);
            setHata(null);
          }}
        />
      )}
    </div>
  );
}

function SikayetKarti({
  grup,
  onSil,
  onKapat,
}: {
  grup: TeleskorSohbetSikayeti[];
  onSil: () => void;
  onKapat: (s: TeleskorSohbetSikayeti) => void;
}) {
  const ilk = grup[0];
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div className="spread" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>
            {ilk.yazar ?? `#${ilk.yazar_id}`}
            <span className="muted" style={{ fontWeight: 400, marginLeft: 8 }}>
              maç #{ilk.match_id}
            </span>
            {grup.length > 1 && (
              <span className="badge" style={{ marginLeft: 8 }}>
                {grup.length} şikayet
              </span>
            )}
          </div>
          <div
            style={{
              marginTop: 8,
              padding: "10px 12px",
              background: "var(--pill, rgba(0,0,0,0.04))",
              borderRadius: 8,
              fontSize: 13.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {ilk.body}
          </div>
        </div>
        <button
          className="btn btn-sm btn-danger"
          style={{ marginLeft: 12 }}
          onClick={onSil}
        >
          Mesajı sil
        </button>
      </div>

      <div style={{ marginTop: 10 }}>
        {grup.map((s) => (
          <div
            key={s.sikayet_id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 0",
              borderTop: "1px solid var(--border)",
              fontSize: 12.5,
            }}
          >
            <span style={{ flex: 1 }}>
              <b>Sebep:</b> {s.reason || "—"}
              <span className="muted" style={{ marginLeft: 8 }}>
                #{s.reporter_id} · {formatDate(s.created_at)}
              </span>
            </span>
            <button className="btn btn-sm" onClick={() => onKapat(s)}>
              Yersiz bul
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
