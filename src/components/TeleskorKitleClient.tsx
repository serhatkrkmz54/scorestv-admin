"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Activity, Radio, RefreshCw, Smartphone, UserPlus } from "lucide-react";
import TeleskorKitleGunluk from "./TeleskorKitleGunluk";

type Kitle = {
  anlik: {
    acikSoket: number;
    izlenenMac: number;
    tekKopya: boolean;
    /** api-1 V82: platform başına online cihaz; eski sunucuda yok. */
    online?: { ANDROID: number; IOS: number; WEB: number } | null;
    onlineToplam?: number;
  };
  cihaz: {
    aktif: number;
    gun: number;
    hafta: number;
    ay: number;
    uyeli: number;
    yeni: number;
    android: number;
    ios: number;
  };
  uye: {
    toplam: number;
    bugun: number;
    hafta: number;
    aktifgun: number;
    aktifhafta: number;
    aktifay: number;
  };
  misafirCihaz: number;
};

/** PostgreSQL takma adları küçük harfe düşürüyor; alan adları ona göre. */
function sayi(v: unknown): string {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n.toLocaleString("tr-TR") : "-";
}

/**
 * KİTLE EKRANI — "kaç kişi var, kaçı şu an bağlı".
 *
 * <h3>Firebase'in yerine geçmiyor, boşluğunu dolduruyor</h3>
 * Günlük/aylık aktif kullanıcı, kurulum sayısı, huni ve elde tutma
 * Firebase Console'da. Burada yalnız Firebase'in bilemeyeceği, kendi
 * sunucumuzdan okunan sayılar var: anlık soket, bildirim erişimi, üye
 * sayıları.
 *
 * <h3>Otomatik yenileme 30 saniye</h3>
 * Anlık soket sayısı sürekli değişiyor; elle yenilenen bir sayı yanlış
 * bir güven verirdi. Sayfa kapalıyken istek atılmıyor.
 */
export default function TeleskorKitleClient() {
  const [veri, setVeri] = useState<Kitle | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    try {
      const r = await fetch("/api/teleskor/kitle", { cache: "no-store" });
      if (!r.ok) throw new Error("alınamadı");
      setVeri(await r.json());
      setHata(null);
    } catch {
      setHata("Teleskor sunucusundan sayılar alınamadı.");
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void yukle();
    const t = setInterval(() => void yukle(), 30_000);
    return () => clearInterval(t);
  }, [yukle]);

  const a = veri?.anlik;
  const c = veri?.cihaz;
  const u = veri?.uye;
  const bos = yukleniyor ? "…" : "-";

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 className="page-title">Kitle</h1>
          <div className="section-hint" style={{ margin: 0 }}>
            Kaç kişi kurdu, kaçı kullanıyor, kaçı şu an içeride. Üstteki sayılar 30 saniyede bir tazelenir.
          </div>
        </div>
        <button className="btn" onClick={() => void yukle()}>
          <RefreshCw size={15} /> Yenile
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      {/* ŞU AN */}
      <div className="stat-grid">
        <Kutu
          baslik="Şu an uygulamada"
          deger={a?.online ? sayi(a.onlineToplam) : bos}
          ipucu={
            a?.online
              ? `Android ${sayi(a.online.ANDROID)} · iOS ${sayi(a.online.IOS)} · Web ${sayi(a.online.WEB)}`
              : "Son birkaç dakikada ekranı açık olan cihaz"
          }
          ikon={<Activity size={20} />}
          renk="success"
        />
        <Kutu
          baslik="Canlı skor bağlantısı"
          deger={a ? sayi(a.acikSoket) : bos}
          ipucu={a ? `${sayi(a.izlenenMac)} maç izleniyor` : "Maç ekranı açık olanlar"}
          ikon={<Radio size={20} />}
        />
        <Kutu
          baslik="Son 24 saatte yeni cihaz"
          deger={c ? sayi(c.yeni) : bos}
          ipucu="İlk kez açılan kurulum; reklamın en hızlı göstergesi"
          ikon={<Smartphone size={20} />}
          renk="warning"
        />
        <Kutu
          baslik="Son 24 saatte yeni üye"
          deger={u ? sayi(u.bugun) : bos}
          ipucu={u ? `Son 7 günde ${sayi(u.hafta)}` : ""}
          ikon={<UserPlus size={20} />}
          renk="neutral"
        />
      </div>

      <TeleskorKitleGunluk />

      {/* TOPLAMLAR */}
      <div className="card card-pad" style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="section-title">Genel toplamlar</div>
          <div className="section-hint" style={{ margin: 0 }}>
            Bugüne kadar biriken sayılar. &quot;Görülen&quot;: uygulamayı ya da siteyi o süre içinde en az bir kez kullanan.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          <Liste
            baslik="Üyeler"
            satirlar={[
              ["Toplam üye", sayi(u?.toplam)],
              ["Son 7 günde kayıt", sayi(u?.hafta)],
              [<Link key="g" href="/teleskor/uyeler?sonGorulme=GUN&sirala=sonGorulme">Son 24 saatte görülen</Link>, sayi(u?.aktifgun)],
              [<Link key="h" href="/teleskor/uyeler?sonGorulme=HAFTA&sirala=sonGorulme">Son 7 günde görülen</Link>, sayi(u?.aktifhafta)],
              ["Son 30 günde görülen", sayi(u?.aktifay)],
            ]}
          />
          <Liste
            baslik="Bildirim alan cihazlar"
            satirlar={[
              ["Toplam aktif", sayi(c?.aktif)],
              ["Android / iOS", `${sayi(c?.android)} / ${sayi(c?.ios)}`],
              ["Hesaba bağlı / misafir", c ? `${sayi(c.uyeli)} / ${sayi(c.aktif - c.uyeli)}` : "-"],
              ["Son 24 saatte / 7 günde / 30 günde görülen", c ? `${sayi(c.gun)} / ${sayi(c.hafta)} / ${sayi(c.ay)}` : "-"],
              ["Favorisi olan misafir cihaz", sayi(veri?.misafirCihaz)],
            ]}
          />
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          Ekranda ne kadar kalındığı, elde tutma ve reklam kaynağı kırılımı Firebase Console&apos;da (Analytics).
          {a?.tekKopya && " Anlık sayılar tek api sunucusundan okunuyor; ikinci sunucu eklenince ikisi de sorulmalı."}
        </div>
      </div>
    </div>
  );
}

function Kutu({
  baslik,
  deger,
  ipucu,
  ikon,
  renk,
}: {
  baslik: string;
  deger: string;
  ipucu: string;
  ikon: React.ReactNode;
  renk?: "success" | "warning" | "neutral";
}) {
  return (
    <div className="stat-card">
      <div style={{ minWidth: 0 }}>
        <div className="stat-label">{baslik}</div>
        <div className="stat-value">{deger}</div>
        <div className="stat-hint">{ipucu}</div>
      </div>
      <div className={`stat-icon${renk ? ` ${renk}` : ""}`}>{ikon}</div>
    </div>
  );
}

function Liste({ baslik, satirlar }: { baslik: string; satirlar: [React.ReactNode, string][] }) {
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{baslik}</div>
      {satirlar.map(([ad, deger], i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            padding: "7px 0",
            borderTop: i ? "1px solid var(--border)" : undefined,
            fontSize: 13,
          }}
        >
          <span className="muted">{ad}</span>
          <b style={{ fontVariantNumeric: "tabular-nums" }}>{deger}</b>
        </div>
      ))}
    </div>
  );
}
