"use client";

import { useCallback, useEffect, useState } from "react";

type Kitle = {
  anlik: { acikSoket: number; izlenenMac: number; tekKopya: boolean };
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

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h1 className="page-title">Teleskor - Kitle</h1>
        <button className="btn" onClick={() => void yukle()}>
          Yenile
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      {/* ŞU AN BAĞLI */}
      <div className="card card-pad">
        <div className="card-title">Şu an bağlı</div>
        {!a ? (
          <div className="muted" style={{ fontSize: 13 }}>
            {yukleniyor ? "Yükleniyor…" : "Alınamadı."}
          </div>
        ) : (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-value">{sayi(a.acikSoket)}</div>
                <div className="stat-label">Açık canlı bağlantı</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{sayi(a.izlenenMac)}</div>
                <div className="stat-label">İzlenen maç</div>
              </div>
            </div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
              Bu sayı, maç ekranı <b>açık olan</b> cihazları gösteriyor -
              uygulamayı kullanan herkesi değil. Bağlantı uygulama kapanınca
              düşüyor, yani gece 03:00&apos;te sıfıra yakın olması normal.
              {a.tekKopya && (
                <>
                  {" "}
                  Sayı tek api sunucusundan okunuyor; ikinci sunucu
                  eklendiğinde toplam için ikisi de sorulmalı.
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* CİHAZLAR */}
      <div className="card card-pad">
        <div className="card-title">Bildirim için kayıtlı cihazlar</div>
        {!c ? (
          <div className="muted" style={{ fontSize: 13 }}>
            {yukleniyor ? "Yükleniyor…" : "Alınamadı."}
          </div>
        ) : (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-value">{sayi(c.aktif)}</div>
                <div className="stat-label">Toplam aktif</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{sayi(c.yeni)}</div>
                <div className="stat-label">Son 24 saatte yeni</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{sayi(c.gun)}</div>
                <div className="stat-label">Son 24 saatte görüldü</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{sayi(c.hafta)}</div>
                <div className="stat-label">Son 7 günde görüldü</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{sayi(c.ay)}</div>
                <div className="stat-label">Son 30 günde görüldü</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {sayi(c.android)} / {sayi(c.ios)}
                </div>
                <div className="stat-label">Android / iOS</div>
              </div>
            </div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
              &quot;Son 24 saatte yeni&quot; reklam çalışmasının en doğrudan
              göstergesi: her yeni kurulum uygulamayı ilk açtığında bir cihaz
              kaydı bırakıyor. Bunların {sayi(c.uyeli)} tanesi bir hesaba
              bağlı, gerisi misafir.
            </div>
          </>
        )}
      </div>

      {/* ÜYELER */}
      <div className="card card-pad">
        <div className="card-title">Üyeler</div>
        {!u ? (
          <div className="muted" style={{ fontSize: 13 }}>
            {yukleniyor ? "Yükleniyor…" : "Alınamadı."}
          </div>
        ) : (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-value">{sayi(u.toplam)}</div>
                <div className="stat-label">Toplam üye</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{sayi(u.bugun)}</div>
                <div className="stat-label">Son 24 saatte kayıt</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{sayi(u.hafta)}</div>
                <div className="stat-label">Son 7 günde kayıt</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{sayi(u.aktifgun)}</div>
                <div className="stat-label">Son 24 saatte giriş</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{sayi(u.aktifhafta)}</div>
                <div className="stat-label">Son 7 günde giriş</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{sayi(veri?.misafirCihaz)}</div>
                <div className="stat-label">Favorili misafir cihaz</div>
              </div>
            </div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
              &quot;Giriş&quot; sayıları son giriş anına bakıyor; oturum 30 gün
              açık kaldığı için uygulamayı her gün açan bir üye burada her gün
              görünmeyebilir. Günlük aktif kullanıcı için Firebase Console
              daha doğru kaynak.
            </div>
          </>
        )}
      </div>

      {/* FIREBASE */}
      <div className="card card-pad">
        <div className="card-title">Firebase Analytics&apos;te ne var</div>
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Bu sayfa yalnız kendi sunucumuzdan okunanları gösteriyor. Kurulum
          sayısı, günlük/aylık aktif kullanıcı, hangi ekranda ne kadar kalındığı,
          elde tutma ve reklam kampanyasının kaynak kırılımı Firebase
          Console&apos;da (Analytics). Uygulama mağaza sürümünde olay
          gönderiyor: onboarding adımları, favori ekleme/çıkarma, maç detayı,
          arama, giriş yöntemi, bildirim izni, oyunlar ve paylaşım.
        </div>
      </div>
    </div>
  );
}
