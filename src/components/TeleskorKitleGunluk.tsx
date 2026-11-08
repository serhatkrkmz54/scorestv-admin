"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * KİTLE GÜN GÜN (api-1 V82).
 *
 * <p>Gün satırını backend gece yazıyor; bugün o ana kadarki hâliyle ayrı
 * geliyor (yeni cihaz gece hesaplanır). Sinyalden gelen sütunlar (aktif,
 * yeni cihaz, online) yalnız ölçüm yapılan günlerde dolu; ölçülmeyen gün
 * "-" (sıfır değil). Yeni üye ve yeni bildirim cihazı kayıt anlarından,
 * geriye dönük dolu.
 *
 * <p>Grafikler elle çizilmiş SVG (kütüphane yok): sütunlar platform platform
 * üst üste, seçili günün online eğrisi dakika dakika.
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

type Dakika = { an: string; android: number; ios: number; web: number; soket: number };

const RENK = { android: "var(--success)", ios: "var(--info)", web: "var(--brand)" };

function s(v: number | null | undefined): string {
  return typeof v === "number" && Number.isFinite(v) ? v.toLocaleString("tr-TR") : "-";
}

function topla(...v: (number | null | undefined)[]): number | null {
  const sayilar = v.filter((x): x is number => typeof x === "number");
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

function kisaGun(g: string): string {
  const [, a, gn] = g.split("-");
  return `${gn}.${a}`;
}

type Olcu = "aktif" | "yeniCihaz" | "online" | "yeniUye";

const OLCULER: { k: Olcu; ad: string }[] = [
  { k: "aktif", ad: "Uygulamayı açan cihaz" },
  { k: "yeniCihaz", ad: "Yeni cihaz" },
  { k: "online", ad: "Aynı anda en çok online" },
  { k: "yeniUye", ad: "Yeni üye" },
];

/** Grafikte bir günün üst üste dilimleri. */
function dilimler(g: Gun, o: Olcu): { renk: string; v: number }[] {
  const d = (v: number | null | undefined, renk: string) => ({ renk, v: typeof v === "number" ? v : 0 });
  switch (o) {
    case "aktif":
      return [d(g.aktifAndroid, RENK.android), d(g.aktifIos, RENK.ios), d(g.aktifWeb, RENK.web)];
    case "yeniCihaz":
      return [d(g.yeniAndroid, RENK.android), d(g.yeniIos, RENK.ios), d(g.yeniWeb, RENK.web)];
    case "online":
      return [d(g.onlineTepe, RENK.web)];
    case "yeniUye":
      return [d(g.yeniUye, RENK.web)];
  }
}

function SutunGrafigi({ gunler, olcu, secili, sec }: {
  gunler: Gun[];
  olcu: Olcu;
  secili: string | null;
  sec: (g: string) => void;
}) {
  const sirali = [...gunler].reverse();
  const G = 760, Y = 180, alt = 22, ust = 10;
  const enCok = Math.max(1, ...sirali.map((g) => dilimler(g, olcu).reduce((a, b) => a + b.v, 0)));
  const w = G / Math.max(sirali.length, 1);
  return (
    <svg viewBox={`0 0 ${G} ${Y}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <text x={0} y={ust} fontSize={10} fill="var(--text-faint)">{s(enCok)}</text>
      {sirali.map((g, i) => {
        let yTaban = Y - alt;
        const parca = dilimler(g, olcu);
        const toplam = parca.reduce((a, b) => a + b.v, 0);
        return (
          <g key={g.gun} onClick={() => sec(g.gun)} style={{ cursor: "pointer" }}>
            <title>{`${g.gun}: ${s(toplam)}`}</title>
            <rect x={i * w} y={0} width={w} height={Y - alt} fill={secili === g.gun ? "var(--surface-2)" : "transparent"} />
            {parca.map((p, j) => {
              const h = (p.v / enCok) * (Y - alt - ust - 4);
              yTaban -= h;
              return <rect key={j} x={i * w + w * 0.15} y={yTaban} width={w * 0.7} height={h} fill={p.renk} rx={1.5} />;
            })}
            {(sirali.length <= 31 || i % Math.ceil(sirali.length / 20) === 0) && (
              <text x={i * w + w / 2} y={Y - 6} fontSize={9} textAnchor="middle" fill="var(--text-faint)">
                {kisaGun(g.gun)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function OnlineEgrisi({ olcumler }: { olcumler: Dakika[] }) {
  const G = 760, Y = 160, alt = 18, ust = 10;
  if (olcumler.length < 2) {
    return <div className="muted" style={{ fontSize: 13 }}>Bu gün için dakikalık ölçüm yok.</div>;
  }
  const enCok = Math.max(1, ...olcumler.map((o) => Math.max(o.android + o.ios + o.web, o.soket)));
  const gunBasi = new Date(olcumler[0].an);
  const bas = new Date(gunBasi.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
  bas.setHours(0, 0, 0, 0);
  const fark = gunBasi.getTime() - new Date(gunBasi.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })).getTime();
  const basMs = bas.getTime() + fark;
  const x = (iso: string) => ((new Date(iso).getTime() - basMs) / 86_400_000) * G;
  const y = (v: number) => Y - alt - (v / enCok) * (Y - alt - ust);
  const cizgi = (f: (o: Dakika) => number) =>
    olcumler.map((o, i) => `${i ? "L" : "M"}${x(o.an).toFixed(1)},${y(f(o)).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${G} ${Y}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <text x={0} y={ust} fontSize={10} fill="var(--text-faint)">{s(enCok)}</text>
      {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
        <text key={h} x={(h / 24) * G} y={Y - 4} fontSize={9} fill="var(--text-faint)">
          {String(h).padStart(2, "0")}:00
        </text>
      ))}
      <path d={cizgi((o) => o.android + o.ios + o.web)} fill="none" stroke="var(--brand)" strokeWidth={1.6} />
      <path d={cizgi((o) => o.android)} fill="none" stroke={RENK.android} strokeWidth={1} />
      <path d={cizgi((o) => o.ios)} fill="none" stroke={RENK.ios} strokeWidth={1} />
      <path d={cizgi((o) => o.soket)} fill="none" stroke="var(--text-faint)" strokeWidth={1} strokeDasharray="3 3" />
    </svg>
  );
}

function Aciklama({ renk, ad, kesik }: { renk: string; ad: string; kesik?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginRight: 14 }}>
      <span style={{ width: 14, height: kesik ? 0 : 8, borderTop: kesik ? `2px dashed ${renk}` : undefined, background: kesik ? undefined : renk, borderRadius: 2 }} />
      {ad}
    </span>
  );
}

export default function TeleskorKitleGunluk() {
  const [donem, setDonem] = useState(30);
  const [olcu, setOlcu] = useState<Olcu>("aktif");
  const [veri, setVeri] = useState<{ bugun: Gun; gunler: Gun[] } | null>(null);
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
    fetch(`/api/teleskor/kitle/dakikalik${gun ? `?gun=${gun}` : ""}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b) => !iptal && setDakika(b.olcumler ?? []))
      .catch(() => !iptal && setDakika([]));
    return () => {
      iptal = true;
    };
  }, [secili]);

  const satirlar = veri ? [veri.bugun, ...veri.gunler] : [];

  return (
    <div className="card card-pad" style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div className="card-title" style={{ margin: 0 }}>Gün gün</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select className="input" value={olcu} onChange={(e) => setOlcu(e.target.value as Olcu)}>
            {OLCULER.map((o) => <option key={o.k} value={o.k}>{o.ad}</option>)}
          </select>
          <select className="input" value={donem} onChange={(e) => setDonem(Number(e.target.value))}>
            <option value={7}>Son 7 gün</option>
            <option value={30}>Son 30 gün</option>
            <option value={90}>Son 90 gün</option>
            <option value={365}>Son 1 yıl</option>
          </select>
        </div>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      {veri && (
        <>
          <SutunGrafigi gunler={satirlar} olcu={olcu} secili={secili ?? veri.bugun.gun} sec={setSecili} />
          <div className="muted" style={{ fontSize: 12 }}>
            {olcu === "aktif" || olcu === "yeniCihaz" ? (
              <>
                <Aciklama renk={RENK.android} ad="Android" />
                <Aciklama renk={RENK.ios} ad="iOS" />
                <Aciklama renk={RENK.web} ad="Web" />
              </>
            ) : null}
            Bir sütuna tıklayınca o günün dakika dakika online eğrisi aşağıda açılır.
          </div>

          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 6 }}>
              Online, dakika dakika: {secili ?? veri.bugun.gun}
            </div>
            {dakika === null ? (
              <div className="muted" style={{ fontSize: 13 }}>Yükleniyor…</div>
            ) : (
              <OnlineEgrisi olcumler={dakika} />
            )}
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              <Aciklama renk="var(--brand)" ad="Toplam online" />
              <Aciklama renk={RENK.android} ad="Android" />
              <Aciklama renk={RENK.ios} ad="iOS" />
              <Aciklama renk="var(--text-faint)" ad="Canlı skor bağlantısı" kesik />
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Gün</th>
                  <th>Açan cihaz</th>
                  <th>Android / iOS / Web</th>
                  <th>Yeni cihaz</th>
                  <th>Online tepe</th>
                  <th>Online ort.</th>
                  <th>Canlı bağlantı tepe</th>
                  <th>Aktif üye</th>
                  <th>Yeni üye</th>
                  <th>Yeni bildirim cihazı (A / i)</th>
                  <th>7 / 30 gün aktif cihaz</th>
                </tr>
              </thead>
              <tbody>
                {satirlar.map((g, i) => (
                  <tr key={g.gun} onClick={() => setSecili(g.gun)} style={{ cursor: "pointer" }}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {g.gun}
                      {i === 0 && <span className="muted"> (bugün, şu ana kadar)</span>}
                    </td>
                    <td><b>{s(topla(g.aktifAndroid, g.aktifIos, g.aktifWeb))}</b></td>
                    <td>{s(g.aktifAndroid)} / {s(g.aktifIos)} / {s(g.aktifWeb)}</td>
                    <td>{i === 0 ? <span className="muted">gece</span> : s(topla(g.yeniAndroid, g.yeniIos, g.yeniWeb))}</td>
                    <td>
                      {s(g.onlineTepe)}
                      {g.onlineTepeAn && <span className="muted"> ({saat(g.onlineTepeAn)})</span>}
                    </td>
                    <td>{s(g.onlineOrt)}</td>
                    <td>{s(g.soketTepe)}</td>
                    <td>{s(g.aktifUye)}</td>
                    <td>{s(g.yeniUye)}</td>
                    <td>{s(g.yeniBildirimAndroid)} / {s(g.yeniBildirimIos)}</td>
                    <td>{s(g.aktif7gun)} / {s(g.aktif30gun)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
            <b>Açan cihaz</b>: o gün uygulamayı en az bir kez açan tekil kurulum
            (sinyal yeni mağaza sürümüyle başlıyor; eski sürümler sayılmaz, güncelleme
            yayıldıkça artar). Silip yeniden kuran yeni cihaz sayılır. <b>Online</b>:
            uygulama ekranda açık olan cihaz, dakikada bir ölçülüyor. <b>Canlı bağlantı</b>:
            yalnız maç ekranı açık olanlar. <b>Aktif üye</b>: o gün oturumu yenilenen üye
            (eski sürümler dâhil). <b>Yeni bildirim cihazı</b> geçmişe dönük dolu; yeni
            kurulumun yaklaşık göstergesi. Mağaza indirme sayıları bir sonraki adımda
            Play Console ve App Store Connect&apos;ten gelecek. &quot;-&quot; = o gün ölçüm yok.
          </div>
        </>
      )}
    </div>
  );
}
