"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * GOOGLE PLAY: KULLANICI NEREDEN GELDİ (api-1 kaynak PLAY_TRAFIK).
 *
 * <p>Play'in mağaza performansı raporu, trafik kaynağı kırılımı. Sayı
 * "mağaza sayfasından edinme": sayfayı görüp uygulamayı yükleyen kullanıcı
 * (kurulum raporundaki cihaz sayısıyla birebir tutmaz, ayrı tanım).
 * Instagram/TikTok gibi dış bağlantılar Play'de "üçüncü taraf yönlendirme"
 * olarak toplanır; hangi sitenin olduğu yalnız bağlantıda utm_source varsa
 * ayrılır. Etiketsiz bağlantı ve Play'in eşiğin altında kalan küçük kaynakları
 * "Other" olarak gelir.
 */

type Dis = Record<string, Record<string, Record<string, number>>>;

const KAYNAK = "PLAY_TRAFIK";

const SERILER = [
  { anahtar: "arama", olcu: "google_play_search", ad: "Play araması", renk: "var(--grafik-kaynak-arama)" },
  { anahtar: "kesfet", olcu: "google_play_explore", ad: "Play'de göz atma", renk: "var(--grafik-kaynak-kesfet)" },
  { anahtar: "dis", olcu: "third_party_referrals", ad: "Dış bağlantı", renk: "var(--grafik-kaynak-dis)" },
  { anahtar: "diger", olcu: "", ad: "Diğer", renk: "var(--text-faint)" },
] as const;

/** utm_source değerlerinin okunur adı; bilinmeyen olduğu gibi. */
const UTM_ADI: Record<string, string> = {
  instagram: "Instagram",
  ig: "Instagram",
  facebook: "Facebook",
  fb: "Facebook",
  tiktok: "TikTok",
  twitter: "X (Twitter)",
  x: "X (Twitter)",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  web: "Web sitemiz",
  site: "Web sitemiz",
  teleskor: "Web sitemiz",
  google: "Google",
  other: "Diğer (Play eşiğin altında birleştirdi)",
};

const EKSEN = { fontSize: 11, fill: "var(--text-faint)" };

function s(v: number | null | undefined): string {
  return typeof v === "number" ? v.toLocaleString("tr-TR") : "-";
}

function kisaGun(g: string): string {
  const [, a, gn] = g.split("-");
  return `${gn}.${a}`;
}

function uzunGun(g: string): string {
  return new Date(`${g}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
}

function oran(pay: number | null, payda: number | null): string {
  if (!pay || !payda) return "-";
  return `%${((pay / payda) * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}

type Nokta = { gun: string; arama: number | null; kesfet: number | null; dis: number | null; diger: number | null };

export default function TeleskorKitleKaynaklar({
  dis,
  gunler,
  bugun,
  playAcik,
}: {
  /** Gün → kaynak → ölçü → sayı (`/gunluk` yanıtının `dis`'i). */
  dis: Dis | undefined;
  /** Dönemin günleri, eskiden yeniye. */
  gunler: string[];
  bugun: string;
  playAcik: boolean;
}) {
  const { noktalar, toplam, utm, varMi } = useMemo(() => {
    const noktalar: Nokta[] = [];
    const toplam: Record<string, { edinme: number; ziyaretci: number }> = {};
    const utm: Record<string, number> = {};
    let varMi = false;
    for (const gun of gunler) {
      const m = dis?.[gun]?.[KAYNAK];
      if (!m || typeof m.edinme !== "number") {
        noktalar.push({ gun, arama: null, kesfet: null, dis: null, diger: null });
        continue;
      }
      varMi = true;
      const n: Nokta = { gun, arama: 0, kesfet: 0, dis: 0, diger: 0 };
      let bilinen = 0;
      for (const x of SERILER) {
        if (!x.olcu) continue;
        const v = m[`edinme:${x.olcu}`] ?? 0;
        n[x.anahtar] = v;
        bilinen += v;
      }
      n.diger = Math.max(0, m.edinme - bilinen);
      noktalar.push(n);
      for (const [olcu, v] of Object.entries(m)) {
        if (olcu.startsWith("edinme:") || olcu.startsWith("ziyaretci:")) {
          const [tur, k] = olcu.split(":", 2);
          const t = (toplam[k] ??= { edinme: 0, ziyaretci: 0 });
          t[tur as "edinme" | "ziyaretci"] += v;
        } else if (olcu.startsWith("utm:")) {
          const k = olcu.slice(4);
          utm[k] = (utm[k] ?? 0) + v;
        }
      }
    }
    return { noktalar, toplam, utm, varMi };
  }, [dis, gunler]);

  const kaynakSatirlari = Object.entries(toplam)
    .map(([k, v]) => ({ k, ...v, ad: SERILER.find((x) => x.olcu === k)?.ad ?? k.replaceAll("_", " ") }))
    .sort((a, b) => b.edinme - a.edinme);
  const genelEdinme = kaynakSatirlari.reduce((a, b) => a + b.edinme, 0);
  const utmSatirlari = Object.entries(utm).sort((a, b) => b[1] - a[1]);
  const utmToplam = utmSatirlari.reduce((a, b) => a + b[1], 0);
  const enCok = utmSatirlari[0]?.[1] ?? 0;

  return (
    <div className="card card-pad" style={{ display: "grid", gap: 14 }}>
      <div>
        <div className="section-title">Google Play: kullanıcı nereden geldi</div>
        <div className="section-hint" style={{ margin: 0 }}>
          Mağaza sayfasını görüp uygulamayı yükleyen kullanıcı, geldiği yere göre. Instagram, TikTok gibi bağlantılar
          &quot;Dış bağlantı&quot;da toplanır; hangi site olduğu yalnız bağlantıda <code>utm_source</code> varsa ayrılır.
        </div>
      </div>

      {!varMi ? (
        <div
          className="muted"
          style={{ padding: "28px 24px", textAlign: "center", fontSize: 13, background: "var(--surface-2)", borderRadius: 10 }}
        >
          {playAcik
            ? "Bu dönemde Play kaynak raporundan sayı yok. Rapor kurulum raporuyla aynı turda okunuyor; en altta \"şimdi oku\" ile çekebilirsin."
            : "Google Play raporu henüz bağlı değil."}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "var(--text-muted)" }}>
            {SERILER.map((x) => (
              <span key={x.anahtar} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span className="kitle-isaret" style={{ background: x.renk }} />
                {x.ad}
              </span>
            ))}
          </div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={noktalar} margin={{ top: 6, right: 4, left: -8, bottom: 0 }} barCategoryGap={noktalar.length > 60 ? 1 : "20%"}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="gun" tickFormatter={kisaGun} tick={EKSEN} tickLine={false} axisLine={{ stroke: "var(--border-strong)" }} minTickGap={18} />
                <YAxis tick={EKSEN} tickLine={false} axisLine={false} allowDecimals={false} width={52} tickFormatter={(v: number) => v.toLocaleString("tr-TR")} />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const n = (payload[0] as { payload: Nokta }).payload;
                    if (n.arama === null) return null;
                    const t = SERILER.reduce((a, x) => a + (n[x.anahtar] ?? 0), 0);
                    return (
                      <div className="kitle-ipucu">
                        <div style={{ fontWeight: 600 }}>
                          {uzunGun(String(label))}
                          {label === bugun && <span className="muted" style={{ fontWeight: 400 }}> (şu ana kadar)</span>}
                        </div>
                        {SERILER.map((x) => (
                          <div key={x.anahtar} className="kitle-ipucu-satir">
                            <span className="kitle-isaret" style={{ background: x.renk }} />
                            {x.ad}
                            <b>{s(n[x.anahtar])}</b>
                          </div>
                        ))}
                        <div className="kitle-ipucu-satir" style={{ borderTop: "1px solid var(--border)", paddingTop: 4 }}>
                          Toplam<b>{s(t)}</b>
                        </div>
                      </div>
                    );
                  }}
                />
                {SERILER.map((x, i) => (
                  <Bar
                    key={x.anahtar}
                    dataKey={x.anahtar}
                    name={x.ad}
                    stackId="k"
                    fill={x.renk}
                    radius={i === SERILER.length - 1 ? [4, 4, 0, 0] : 0}
                    stroke="var(--surface)"
                    strokeWidth={noktalar.length <= 60 ? 1 : 0}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="kitle-grafikler">
            <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
              <div className="section-title" style={{ fontSize: 14 }}>Kaynağa göre · dönem toplamı</div>
              <table className="kitle-tablo">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Kaynak</th>
                    <th>Yükleyen</th>
                    <th>Pay</th>
                    <th>Sayfayı gören</th>
                    <th>Dönüşüm</th>
                  </tr>
                </thead>
                <tbody>
                  {kaynakSatirlari.map((r) => (
                    <tr key={r.k}>
                      <td style={{ textAlign: "left" }}>{r.ad}</td>
                      <td>{s(r.edinme)}</td>
                      <td>{oran(r.edinme, genelEdinme)}</td>
                      <td>{s(r.ziyaretci)}</td>
                      <td>{oran(r.edinme, r.ziyaretci)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
              <div className="section-title" style={{ fontSize: 14 }}>Dış bağlantılar · utm_source</div>
              {utmSatirlari.length === 0 ? (
                <div className="muted" style={{ fontSize: 13 }}>
                  Bu dönemde etiketli bağlantıdan gelen yok. Sosyal medyadaki Play bağlantısına
                  <code> &amp;utm_source=instagram</code> gibi bir etiket eklenince burada ayrı satır olur.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {utmSatirlari.map(([k, v]) => (
                    <div key={k} style={{ display: "grid", gap: 3 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span>
                          {UTM_ADI[k] ?? k}
                          {UTM_ADI[k] && k !== "other" && <span className="muted"> · {k}</span>}
                        </span>
                        <span>
                          <b>{s(v)}</b> <span className="muted">{oran(v, utmToplam)}</span>
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "var(--surface-2)" }}>
                        <div
                          style={{
                            width: `${enCok ? (v / enCok) * 100 : 0}%`,
                            height: "100%",
                            borderRadius: 3,
                            background: "var(--grafik-kaynak-dis)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>
            Play bu sayıyı kurulum raporundan ayrı tanımla sayar (cihaz değil kullanıcı; uygulama başka cihazında zaten
            olan sayılmaz), iki sayı birebir tutmaz. Rapor birkaç gün geriden gelir.
          </div>
        </>
      )}
    </div>
  );
}
