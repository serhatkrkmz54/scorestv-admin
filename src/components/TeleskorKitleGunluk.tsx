"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, MonitorSmartphone, Radio, UserPlus } from "lucide-react";

/**
 * KİTLE GÜN GÜN (api-1 V82 + V83).
 *
 * <p>Gün satırını backend gece yazıyor; bugün o ana kadarki hâliyle ayrı
 * geliyor. Sinyalden gelen sayılar (açan cihaz, yeni cihaz, online) yalnız
 * ölçüm yapılan günlerde dolu; ölçülmeyen gün grafikte boşluk, tabloda "-"
 * (sıfır değil). Yeni üye ve yeni bildirim cihazı geriye dönük dolu.
 *
 * <p>Mağaza sayıları (V83) gün → kaynak → ölçü sözlüğünde gelir. Google Play
 * cihaz, App Store Apple hesabı sayar: iki mağaza yan yana gösterilir,
 * TOPLANMAZ.
 *
 * <p>Düzen: dönem özeti kutuları, dört günlük grafik (her biri tek soruya
 * cevap), seçili günün dakikalık online grafiği, ayrıntı tablosu açılır
 * bölümde, rapor kaynakları en altta. Grafikler recharts; renkler
 * `--grafik-*` belirteçlerinden (Android/iOS/Web her yerde aynı renk).
 */

type Gun = {
  gun: string;
  aktifAndroid?: number | null;
  aktifIos?: number | null;
  aktifWeb?: number | null;
  yeniAndroid?: number | null;
  yeniIos?: number | null;
  yeniWeb?: number | null;
  aktif7gun?: number | null;
  aktif30gun?: number | null;
  onlineTepe?: number | null;
  onlineTepeAn?: string | null;
  onlineOrt?: number | null;
  soketTepe?: number | null;
  aktifUye?: number | null;
  yeniUye?: number | null;
  yeniBildirimAndroid?: number | null;
  yeniBildirimIos?: number | null;
  olcumDakika?: number;
};

/** Gün → kaynak (PLAY, APPSTORE) → ölçü → sayı. */
type Dis = Record<string, Record<string, Record<string, number>>>;

type Dakika = { an: string; android: number; ios: number; web: number; soket: number };

const RENK = {
  android: "var(--grafik-android)",
  ios: "var(--grafik-ios)",
  web: "var(--grafik-web)",
  notr: "var(--text-faint)",
};

const EKSEN = { fontSize: 11, fill: "var(--text-faint)" };

function s(v: number | null | undefined): string {
  return typeof v === "number" && Number.isFinite(v) ? v.toLocaleString("tr-TR") : "-";
}

function sayiMi(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function topla(...v: (number | null | undefined)[]): number | null {
  const sayilar = v.filter(sayiMi);
  return sayilar.length ? sayilar.reduce((a, b) => a + b, 0) : null;
}

function saat(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });
}

/** İstanbul saatiyle günün kaçıncı dakikası. */
function gunDakikasi(iso: string): number {
  const [h, m] = saat(iso).split(":").map(Number);
  return h * 60 + m;
}

const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function kisaGun(g: string): string {
  const [, a, gn] = g.split("-");
  return `${Number(gn)} ${AYLAR[Number(a) - 1]}`;
}

function uzunGun(g: string): string {
  return new Date(`${g}T12:00:00Z`).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
}

function dis_(dis: Dis | undefined, gun: string, kaynak: string, olcu: string): number | null {
  const v = dis?.[gun]?.[kaynak]?.[olcu];
  return sayiMi(v) ? v : null;
}

/** Grafiğin bir günü; ölçülmemiş değer null (çizgide boşluk). */
type Nokta = {
  gun: string;
  android: number | null;
  ios: number | null;
  web: number | null;
  yeniCihaz: number | null;
  playKurulum: number | null;
  appIlk: number | null;
  onlineTepe: number | null;
  soketTepe: number | null;
  yeniUye: number | null;
};

type Seri = { anahtar: keyof Nokta; ad: string; renk: string };

/* ---------- Ortak parçalar ---------- */

function Ipucu({
  active,
  payload,
  label,
  seriler,
  bugun,
}: {
  active?: boolean;
  payload?: { dataKey?: unknown; value?: unknown }[];
  label?: unknown;
  seriler: Seri[];
  bugun?: string;
}) {
  if (!active || !payload?.length) return null;
  const gun = String(label ?? "");
  const deger = (k: keyof Nokta) => payload.find((p) => p.dataKey === k)?.value as number | null | undefined;
  const toplam = seriler.length > 1 ? topla(...seriler.map((x) => deger(x.anahtar))) : null;
  return (
    <div className="kitle-ipucu">
      <div style={{ fontWeight: 600 }}>
        {uzunGun(gun)}
        {gun === bugun && <span className="muted" style={{ fontWeight: 400 }}> (şu ana kadar)</span>}
      </div>
      {seriler.map((x) => (
        <div key={x.anahtar} className="kitle-ipucu-satir">
          <span className="kitle-isaret" style={{ background: x.renk }} />
          {x.ad}
          <b>{s(deger(x.anahtar))}</b>
        </div>
      ))}
      {toplam !== null && seriler.length > 1 && !seriler.some((x) => x.anahtar === "playKurulum") && (
        <div className="kitle-ipucu-satir" style={{ borderTop: "1px solid var(--border)", paddingTop: 4 }}>
          Toplam<b>{s(toplam)}</b>
        </div>
      )}
    </div>
  );
}

function Aciklama({ seriler, kesik }: { seriler: Seri[]; kesik?: { ad: string } }) {
  if (seriler.length < 2 && !kesik) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "var(--text-muted)" }}>
      {seriler.map((x) => (
        <span key={x.anahtar} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span className="kitle-isaret" style={{ background: x.renk }} />
          {x.ad}
        </span>
      ))}
      {kesik && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, borderTop: `2px dashed ${RENK.notr}` }} />
          {kesik.ad}
        </span>
      )}
    </div>
  );
}

function GrafikKarti({
  baslik,
  alt,
  bos,
  children,
}: {
  baslik: string;
  alt: string;
  bos?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="card card-pad" style={{ display: "grid", gap: 10, alignContent: "start" }}>
      <div>
        <div className="section-title">{baslik}</div>
        <div className="section-hint" style={{ margin: 0 }}>{alt}</div>
      </div>
      {bos ? (
        <div
          className="muted"
          style={{
            height: 220,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            fontSize: 13,
            padding: "0 24px",
            background: "var(--surface-2)",
            borderRadius: 10,
          }}
        >
          {bos}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/** Günlük sütun grafiği: üst üste (platform) ya da yan yana (mağaza). */
function GunGrafigi({
  veri,
  seriler,
  ustUste,
  bugun,
  secili,
  sec,
}: {
  veri: Nokta[];
  seriler: Seri[];
  ustUste: boolean;
  bugun: string;
  secili: string;
  sec: (g: string) => void;
}) {
  return (
    <>
      <Aciklama seriler={seriler} />
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart
            data={veri}
            margin={{ top: 6, right: 4, left: -8, bottom: 0 }}
            barCategoryGap={veri.length > 60 ? 1 : seriler.length > 1 && !ustUste ? "10%" : "20%"}
            barGap={1}
            onClick={(e) => {
              const g = (e as { activeLabel?: unknown } | null)?.activeLabel;
              if (typeof g === "string") sec(g);
            }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="gun" tickFormatter={kisaGun} tick={EKSEN} tickLine={false} axisLine={{ stroke: "var(--border-strong)" }} minTickGap={18} />
            <YAxis tick={EKSEN} tickLine={false} axisLine={false} allowDecimals={false} width={44} tickFormatter={(v: number) => v.toLocaleString("tr-TR")} />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={(p) => <Ipucu {...(p as object)} seriler={seriler} bugun={bugun} />}
            />
            {seriler.map((x, i) => (
              <Bar
                key={x.anahtar}
                dataKey={x.anahtar}
                name={x.ad}
                stackId={ustUste ? "y" : undefined}
                fill={x.renk}
                radius={!ustUste || i === seriler.length - 1 ? [4, 4, 0, 0] : 0}
                stroke="var(--surface)"
                strokeWidth={ustUste && veri.length <= 60 ? 1 : 0}
                isAnimationActive={false}
                cursor="pointer"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="muted" style={{ fontSize: 11.5 }}>
        Seçili gün: <b>{kisaGun(secili)}</b> · bir sütuna tıklayınca alttaki dakikalık grafik o güne geçer.
      </div>
    </>
  );
}

function OnlineEgrisi({ olcumler }: { olcumler: Dakika[] }) {
  const veri = useMemo(
    () => olcumler.map((o) => ({ t: gunDakikasi(o.an), an: o.an, android: o.android, ios: o.ios, web: o.web, soket: o.soket })),
    [olcumler],
  );
  if (veri.length < 2) {
    return (
      <div className="muted" style={{ height: 240, display: "grid", placeItems: "center", fontSize: 13, background: "var(--surface-2)", borderRadius: 10 }}>
        Bu gün için dakikalık ölçüm yok.
      </div>
    );
  }
  const seriler: Seri[] = [
    { anahtar: "android", ad: "Android", renk: RENK.android },
    { anahtar: "ios", ad: "iOS", renk: RENK.ios },
    { anahtar: "web", ad: "Web", renk: RENK.web },
  ];
  return (
    <>
      <Aciklama seriler={seriler} kesik={{ ad: "Canlı skor bağlantısı (maç ekranı açık)" }} />
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <AreaChart data={veri} margin={{ top: 6, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="t"
              type="number"
              domain={[0, 1440]}
              ticks={[0, 180, 360, 540, 720, 900, 1080, 1260, 1440]}
              tickFormatter={(m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:00`}
              tick={EKSEN}
              tickLine={false}
              axisLine={{ stroke: "var(--border-strong)" }}
            />
            <YAxis tick={EKSEN} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const o = (payload[0] as { payload: (typeof veri)[number] }).payload;
                return (
                  <div className="kitle-ipucu">
                    <div style={{ fontWeight: 600 }}>{saat(o.an)}</div>
                    {seriler.map((x) => (
                      <div key={x.anahtar} className="kitle-ipucu-satir">
                        <span className="kitle-isaret" style={{ background: x.renk }} />
                        {x.ad}
                        <b>{s(o[x.anahtar as "android" | "ios" | "web"])}</b>
                      </div>
                    ))}
                    <div className="kitle-ipucu-satir" style={{ borderTop: "1px solid var(--border)", paddingTop: 4 }}>
                      Toplam online<b>{s(o.android + o.ios + o.web)}</b>
                    </div>
                    <div className="kitle-ipucu-satir">
                      Canlı skor bağlantısı<b>{s(o.soket)}</b>
                    </div>
                  </div>
                );
              }}
            />
            {seriler.map((x) => (
              <Area
                key={x.anahtar}
                type="monotone"
                dataKey={x.anahtar}
                stackId="o"
                stroke={x.renk}
                strokeWidth={1.5}
                fill={x.renk}
                fillOpacity={0.22}
                isAnimationActive={false}
              />
            ))}
            <Line type="monotone" dataKey="soket" stroke={RENK.notr} strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function OzetKutusu({
  baslik,
  deger,
  ipucu,
  ikon,
}: {
  baslik: string;
  deger: string;
  ipucu: React.ReactNode;
  ikon: React.ReactNode;
}) {
  return (
    <div className="stat-card">
      <div style={{ minWidth: 0 }}>
        <div className="stat-label">{baslik}</div>
        <div className="stat-value">{deger}</div>
        <div className="stat-hint">{ipucu}</div>
      </div>
      <div className="stat-icon">{ikon}</div>
    </div>
  );
}

const DONEMLER = [
  { g: 7, ad: "7 gün" },
  { g: 30, ad: "30 gün" },
  { g: 90, ad: "90 gün" },
  { g: 365, ad: "1 yıl" },
];

export default function TeleskorKitleGunluk() {
  const [donem, setDonem] = useState(30);
  const [veri, setVeri] = useState<{
    bugun: Gun;
    gunler: Gun[];
    dis?: Dis;
    kaynaklar?: Record<string, boolean>;
  } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [secili, setSecili] = useState<string | null>(null);
  const [dakika, setDakika] = useState<Dakika[] | null>(null);

  const yukle = useCallback(async (g: number) => {
    try {
      const r = await fetch(`/api/teleskor/kitle/gunluk?gun=${g}`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      setVeri(await r.json());
      setHata(null);
    } catch {
      setHata("Gün gün sayılar alınamadı.");
    }
  }, []);

  useEffect(() => {
    void yukle(donem);
  }, [donem, yukle]);

  useEffect(() => {
    let iptal = false;
    const gun = secili ?? "";
    setDakika(null);
    fetch(`/api/teleskor/kitle/dakikalik${gun ? `?gun=${gun}` : ""}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b) => !iptal && setDakika(b.olcumler ?? []))
      .catch(() => !iptal && setDakika([]));
    return () => {
      iptal = true;
    };
  }, [secili]);

  const [playDurum, setPlayDurum] = useState<string | null>(null);
  const [playOkunuyor, setPlayOkunuyor] = useState(false);
  const playOku = useCallback(async () => {
    setPlayOkunuyor(true);
    try {
      const r = await fetch("/api/teleskor/kitle/play-tazele", { method: "POST" });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b?.message);
      if (b.hata) {
        setPlayDurum(`Okunamadı: ${b.hata}`);
      } else {
        setPlayDurum(`Okundu: ${b.dosya} dosya, ${b.indirilen} indirildi, ${b.degisen} değer değişti.`);
        await yukle(donem);
      }
    } catch (e) {
      setPlayDurum(e instanceof Error && e.message ? e.message : "Okunamadı.");
    } finally {
      setPlayOkunuyor(false);
    }
  }, [donem, yukle]);

  const [appDurum, setAppDurum] = useState<string | null>(null);
  const [appOkunuyor, setAppOkunuyor] = useState(false);
  const appOku = useCallback(async () => {
    setAppOkunuyor(true);
    try {
      const r = await fetch("/api/teleskor/kitle/appstore-tazele", { method: "POST" });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b?.message);
      const ozet = `${b.sorulan} gün soruldu, ${b.yazilanGun} yazıldı, ${b.hazirDegil} gün henüz hazır değil`;
      setAppDurum(b.hata ? `Okunamadı: ${b.hata} (${ozet})` : `Okundu: ${ozet}.`);
      await yukle(donem);
    } catch (e) {
      setAppDurum(e instanceof Error && e.message ? e.message : "Okunamadı.");
    } finally {
      setAppOkunuyor(false);
    }
  }, [donem, yukle]);

  // Her gün bir satır: kitle_gunluk'ta satırı olmayan ama mağaza raporunda
  // olan günler de (V82 öncesi tarih). Yeniden eskiye.
  const satirlar: Gun[] = useMemo(() => {
    if (!veri) return [];
    const liste = [veri.bugun, ...veri.gunler];
    if (veri.dis) {
      const var_ = new Set(liste.map((g) => g.gun));
      for (const gun of Object.keys(veri.dis)) if (!var_.has(gun)) liste.push({ gun });
    }
    return liste.sort((a, b) => (a.gun < b.gun ? 1 : a.gun > b.gun ? -1 : 0));
  }, [veri]);

  const dis = veri?.dis;
  const bugun = veri?.bugun.gun ?? "";
  const seciliGun = secili ?? bugun;
  const playAcik = veri?.kaynaklar?.PLAY ?? false;
  const appAcik = veri?.kaynaklar?.APPSTORE ?? false;

  // Grafikler eskiden yeniye.
  const noktalar: Nokta[] = useMemo(
    () =>
      [...satirlar].reverse().map((g) => ({
        gun: g.gun,
        android: g.aktifAndroid ?? null,
        ios: g.aktifIos ?? null,
        web: g.aktifWeb ?? null,
        yeniCihaz: g.gun === bugun ? null : topla(g.yeniAndroid, g.yeniIos, g.yeniWeb),
        playKurulum: dis_(dis, g.gun, "PLAY", "daily_device_installs"),
        appIlk: dis_(dis, g.gun, "APPSTORE", "ilk_indirme"),
        onlineTepe: g.onlineTepe ?? null,
        soketTepe: g.soketTepe ?? null,
        yeniUye: g.yeniUye ?? null,
      })),
    [satirlar, dis, bugun],
  );

  // Dönem özeti: tamamlanmış günler (bugün yarım gün, toplama girmez).
  const ozet = useMemo(() => {
    const tamam = noktalar.filter((n) => n.gun !== bugun);
    const topla_ = (f: (n: Nokta) => number | null) => topla(...tamam.map(f));
    const acan = tamam.map((n) => topla(n.android, n.ios, n.web)).filter(sayiMi);
    const dun = tamam[tamam.length - 1];
    let tepe: { v: number; gun: string } | null = null;
    for (const n of noktalar) if (sayiMi(n.onlineTepe) && (!tepe || n.onlineTepe > tepe.v)) tepe = { v: n.onlineTepe, gun: n.gun };
    return {
      play: topla_((n) => n.playKurulum),
      app: topla_((n) => n.appIlk),
      acanOrt: acan.length ? Math.round(acan.reduce((a, b) => a + b, 0) / acan.length) : null,
      acanDun: dun ? topla(dun.android, dun.ios, dun.web) : null,
      acanGun: acan.length,
      yeniUye: topla_((n) => n.yeniUye),
      yeniUyeDun: dun?.yeniUye ?? null,
      tepe,
    };
  }, [noktalar, bugun]);

  const var_ = (f: (n: Nokta) => number | null) => noktalar.some((n) => sayiMi(f(n)));

  const PLATFORM: Seri[] = [
    { anahtar: "android", ad: "Android", renk: RENK.android },
    { anahtar: "ios", ad: "iOS", renk: RENK.ios },
    { anahtar: "web", ad: "Web", renk: RENK.web },
  ];
  const MAGAZA: Seri[] = [
    ...(playAcik || var_((n) => n.playKurulum) ? [{ anahtar: "playKurulum" as const, ad: "Google Play kurulum", renk: RENK.android }] : []),
    ...(appAcik || var_((n) => n.appIlk) ? [{ anahtar: "appIlk" as const, ad: "App Store ilk indirme", renk: RENK.ios }] : []),
  ];
  const donemAdi = DONEMLER.find((d) => d.g === donem)?.ad ?? `${donem} gün`;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div className="card-title">Gün gün</div>
          <div className="section-hint" style={{ margin: 0 }}>
            Kutulardaki toplamlar bugünü saymaz (gün bitmedi); grafiklerde bugün şu ana kadarki hâliyle.
          </div>
        </div>
        <div className="tabs" role="tablist" style={{ borderBottom: "none" }}>
          {DONEMLER.map((d) => (
            <button
              key={d.g}
              role="tab"
              aria-selected={donem === d.g}
              className={`tab${donem === d.g ? " active" : ""}`}
              onClick={() => setDonem(d.g)}
            >
              {d.ad}
            </button>
          ))}
        </div>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}
      {!veri && !hata && <div className="muted" style={{ fontSize: 13 }}>Yükleniyor…</div>}

      {veri && (
        <>
          <div className="stat-grid">
            <OzetKutusu
              baslik={`Google Play kurulum · ${donemAdi}`}
              deger={playAcik || sayiMi(ozet.play) ? s(ozet.play) : "-"}
              ipucu={playAcik ? "Google'ın raporu; son 2-3 gün gecikmeli gelir" : "Rapor bağlı değil"}
              ikon={<Download size={20} />}
            />
            <OzetKutusu
              baslik={`App Store ilk indirme · ${donemAdi}`}
              deger={appAcik || sayiMi(ozet.app) ? s(ozet.app) : "-"}
              ipucu={appAcik ? "Apple'ın raporu; dün sabaha doğru gelir" : "Rapor bağlı değil"}
              ikon={<Download size={20} />}
            />
            <OzetKutusu
              baslik="Uygulamayı açan cihaz (dün)"
              deger={s(ozet.acanDun)}
              ipucu={ozet.acanOrt !== null ? `Günde ortalama ${s(ozet.acanOrt)} (${ozet.acanGun} ölçülen gün)` : "Ölçüm yeni mağaza sürümüyle başlıyor"}
              ikon={<MonitorSmartphone size={20} />}
            />
            <OzetKutusu
              baslik={`Yeni üye · ${donemAdi}`}
              deger={s(ozet.yeniUye)}
              ipucu={
                <>
                  Dün {s(ozet.yeniUyeDun)}
                  {ozet.tepe && <> · En çok aynı anda online {s(ozet.tepe.v)} ({kisaGun(ozet.tepe.gun)})</>}
                </>
              }
              ikon={<UserPlus size={20} />}
            />
          </div>

          <div className="kitle-grafikler">
            <GrafikKarti
              baslik="Mağazadan indirme"
              alt="Play kurulum yapan cihazı, App Store ilk kez indiren Apple hesabını sayar; yan yana durur, toplanmaz."
              bos={
                MAGAZA.length === 0
                  ? "Mağaza raporları henüz bağlı değil."
                  : !var_((n) => n.playKurulum) && !var_((n) => n.appIlk)
                    ? "Bu dönemde mağaza raporundan sayı yok. Rapor bağlandıysa en altta \"şimdi oku\" ile çekebilirsin."
                    : null
              }
            >
              <GunGrafigi veri={noktalar} seriler={MAGAZA} ustUste={false} bugun={bugun} secili={seciliGun} sec={setSecili} />
            </GrafikKarti>

            <GrafikKarti
              baslik="Uygulamayı açan cihaz"
              alt="O gün uygulamayı en az bir kez açan tekil cihaz, platforma göre."
              bos={var_((n) => topla(n.android, n.ios, n.web)) ? null : "Bu dönemde ölçüm yok. Sayım yeni mağaza sürümüyle başlıyor; güncelleme yayıldıkça artar."}
            >
              <GunGrafigi veri={noktalar} seriler={PLATFORM} ustUste bugun={bugun} secili={seciliGun} sec={setSecili} />
            </GrafikKarti>

            <GrafikKarti
              baslik="Aynı anda en çok online"
              alt="Günün en kalabalık dakikasında uygulamayı ekranda açık tutan cihaz."
              bos={var_((n) => n.onlineTepe) ? null : "Bu dönemde online ölçümü yok."}
            >
              <GunGrafigi
                veri={noktalar}
                seriler={[{ anahtar: "onlineTepe", ad: "Online tepe", renk: RENK.web }]}
                ustUste={false}
                bugun={bugun}
                secili={seciliGun}
                sec={setSecili}
              />
            </GrafikKarti>

            <GrafikKarti
              baslik="Yeni üye"
              alt="O gün hesap açan kişi (e-posta, Google ya da Apple ile)."
              bos={var_((n) => n.yeniUye) ? null : "Bu dönemde yeni üye yok."}
            >
              <GunGrafigi
                veri={noktalar}
                seriler={[{ anahtar: "yeniUye", ad: "Yeni üye", renk: RENK.web }]}
                ustUste={false}
                bugun={bugun}
                secili={seciliGun}
                sec={setSecili}
              />
            </GrafikKarti>
          </div>

          <div className="card card-pad" style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 10 }}>
              <div>
                <div className="section-title">
                  Online, dakika dakika · {uzunGun(seciliGun)}
                  {seciliGun === bugun && <span className="muted" style={{ fontWeight: 400 }}> (bugün)</span>}
                </div>
                <div className="section-hint" style={{ margin: 0 }}>
                  Uygulamayı ekranda açık tutan cihaz, dakikada bir ölçülür. Gece sıfıra yaklaşması normal.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Radio size={16} style={{ color: "var(--text-faint)" }} />
                <input
                  type="date"
                  className="input"
                  style={{ width: "auto" }}
                  value={seciliGun}
                  max={bugun}
                  onChange={(e) => e.target.value && setSecili(e.target.value)}
                />
                {seciliGun !== bugun && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setSecili(null)}>
                    Bugün
                  </button>
                )}
              </div>
            </div>
            {dakika === null ? (
              <div className="muted" style={{ height: 240, display: "grid", placeItems: "center", fontSize: 13 }}>Yükleniyor…</div>
            ) : (
              <OnlineEgrisi olcumler={dakika} />
            )}
          </div>

          <details className="card card-pad">
            <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>
              Bütün sayılar, tablo hâlinde ({satirlar.length} gün)
            </summary>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="data-table kitle-tablo">
                <thead>
                  <tr>
                    <th />
                    <th colSpan={4} className="grup-bas">Uygulama</th>
                    <th colSpan={3} className="grup-bas">Online</th>
                    <th colSpan={3} className="grup-bas">Üye ve bildirim</th>
                    <th colSpan={3} className="grup-bas">Google Play</th>
                    <th colSpan={3} className="grup-bas">App Store</th>
                  </tr>
                  <tr>
                    <th>Gün</th>
                    <th className="grup-bas">Açan cihaz</th>
                    <th>Android / iOS / Web</th>
                    <th>Yeni cihaz</th>
                    <th>7 / 30 gün</th>
                    <th className="grup-bas">Tepe</th>
                    <th>Ortalama</th>
                    <th>Canlı skor</th>
                    <th className="grup-bas">Aktif üye</th>
                    <th>Yeni üye</th>
                    <th>Yeni bildirim (A / i)</th>
                    <th className="grup-bas">Kurulum</th>
                    <th>Kaldırma</th>
                    <th>Cihazda kurulu</th>
                    <th className="grup-bas">İlk indirme</th>
                    <th>Yeniden</th>
                    <th>Güncelleme</th>
                  </tr>
                </thead>
                <tbody>
                  {satirlar.map((g) => (
                    <tr
                      key={g.gun}
                      onClick={() => setSecili(g.gun)}
                      style={{ cursor: "pointer", background: g.gun === seciliGun ? "var(--surface-2)" : undefined }}
                    >
                      <td>
                        {kisaGun(g.gun)} {g.gun.slice(0, 4)}
                        {g.gun === bugun && <span className="muted"> (bugün)</span>}
                      </td>
                      <td className="grup-bas"><b>{s(topla(g.aktifAndroid, g.aktifIos, g.aktifWeb))}</b></td>
                      <td>{s(g.aktifAndroid)} / {s(g.aktifIos)} / {s(g.aktifWeb)}</td>
                      <td>{g.gun === bugun ? <span className="muted">gece</span> : s(topla(g.yeniAndroid, g.yeniIos, g.yeniWeb))}</td>
                      <td>{s(g.aktif7gun)} / {s(g.aktif30gun)}</td>
                      <td className="grup-bas">
                        {s(g.onlineTepe)}
                        {g.onlineTepeAn && <span className="muted"> ({saat(g.onlineTepeAn)})</span>}
                      </td>
                      <td>{s(g.onlineOrt)}</td>
                      <td>{s(g.soketTepe)}</td>
                      <td className="grup-bas">{s(g.aktifUye)}</td>
                      <td>{s(g.yeniUye)}</td>
                      <td>{s(g.yeniBildirimAndroid)} / {s(g.yeniBildirimIos)}</td>
                      <td className="grup-bas">{s(dis_(dis, g.gun, "PLAY", "daily_device_installs"))}</td>
                      <td>{s(dis_(dis, g.gun, "PLAY", "daily_device_uninstalls"))}</td>
                      <td>{s(dis_(dis, g.gun, "PLAY", "active_device_installs"))}</td>
                      <td className="grup-bas">{s(dis_(dis, g.gun, "APPSTORE", "ilk_indirme"))}</td>
                      <td>{s(dis_(dis, g.gun, "APPSTORE", "yeniden_indirme"))}</td>
                      <td>{s(dis_(dis, g.gun, "APPSTORE", "guncelleme"))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, margin: "12px 0 0", display: "grid", gridTemplateColumns: "max-content 1fr", columnGap: 12 }}>
              <dt><b>Açan cihaz</b></dt>
              <dd style={{ margin: 0 }}>O gün uygulamayı en az bir kez açan tekil kurulum. Eski mağaza sürümleri sayılmaz; silip yeniden kuran yeni cihaz sayılır.</dd>
              <dt><b>Online</b></dt>
              <dd style={{ margin: 0 }}>Uygulama ekranda açık olan cihaz, dakikada bir ölçülür. Canlı skor: yalnız maç ekranı açık olanlar.</dd>
              <dt><b>Aktif üye</b></dt>
              <dd style={{ margin: 0 }}>O gün oturumu yenilenen üye (eski sürümler dâhil).</dd>
              <dt><b>Yeni bildirim</b></dt>
              <dd style={{ margin: 0 }}>O gün ilk kez kaydolan bildirim cihazı; geçmişe dönük dolu, yeni kurulumun yaklaşık göstergesi.</dd>
              <dt><b>Google Play</b></dt>
              <dd style={{ margin: 0 }}>Google&apos;ın raporu: o gün kuran / kaldıran Android cihaz ve uygulamanın kurulu olduğu cihaz. Son 2-3 gün gecikmeli.</dd>
              <dt><b>App Store</b></dt>
              <dd style={{ margin: 0 }}>Apple&apos;ın satış raporu: ilk kez indiren Apple hesabı, aynı hesabın tekrar indirmesi, güncelleme. Apple kaldırma vermez; günü Pasifik saatine göre.</dd>
              <dt><b>&quot;-&quot;</b></dt>
              <dd style={{ margin: 0 }}>O gün ölçüm yok (sıfır değil).</dd>
            </dl>
          </details>

          <div className="card card-pad" style={{ display: "grid", gap: 12 }}>
            <div>
              <div className="section-title">Mağaza raporları</div>
              <div className="section-hint" style={{ margin: 0 }}>
                Sunucu ikisini de 6 saatte bir kendisi okur. Beklemek istemezsen buradan hemen okutabilirsin.
              </div>
            </div>
            <Kaynak ad="Google Play" acik={playAcik} okunuyor={playOkunuyor} oku={playOku} durum={playDurum} />
            <Kaynak ad="App Store" acik={appAcik} okunuyor={appOkunuyor} oku={appOku} durum={appDurum} />
          </div>
        </>
      )}
    </div>
  );
}

function Kaynak({
  ad,
  acik,
  okunuyor,
  oku,
  durum,
}: {
  ad: string;
  acik: boolean;
  okunuyor: boolean;
  oku: () => Promise<void>;
  durum: string | null;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
      <b style={{ minWidth: 100 }}>{ad}</b>
      <span className={`badge ${acik ? "badge-published" : "badge-draft"}`}>{acik ? "Bağlı" : "Bağlı değil"}</span>
      <span className="muted" style={{ fontSize: 12.5, flex: 1, minWidth: 200 }}>
        {durum ?? (acik ? "" : "Sunucuda anahtarı tanımlı değil.")}
      </span>
      {acik && (
        <button className="btn btn-ghost btn-sm" onClick={() => void oku()} disabled={okunuyor}>
          {okunuyor ? "Okunuyor…" : "Şimdi oku"}
        </button>
      )}
    </div>
  );
}
