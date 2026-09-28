"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, LogOut, Menu } from "lucide-react";
import { useMobilMenu } from "@/components/MobilMenu";
import { apiLogout } from "@/lib/api-client";
import { gorunenAd, type AppUser } from "@/lib/types";

/** Rota → sayfa başlığı (menüdeki adlar). */
const BASLIKLAR: [string, string][] = [
  ["/teleskor/haber/yeni", "Yeni Haber"],
  ["/teleskor/haber", "Haberler"],
  ["/teleskor/duyuru", "Duyurular"],
  ["/teleskor/surum-notu", "Sürüm Notları"],
  ["/teleskor/mac-ozeti", "Maç Özeti"],
  ["/teleskor/one-cikan-ligler", "Öne Çıkan Ligler"],
  ["/teleskor/kadro", "Kadro Masası"],
  ["/teleskor/veri", "Veri Düzeltme"],
  ["/teleskor/ceviri", "Çeviri Düzeltme"],
  ["/teleskor/uyeler", "Üyeler"],
  ["/teleskor/kitle", "Kitle"],
  ["/teleskor/destek", "Destek"],
  ["/teleskor/sohbet", "Sohbet Şikayetleri"],
  ["/teleskor/akis", "Akış Şikayetleri"],
  ["/teleskor/market/siparisler", "Market Siparişleri"],
  ["/teleskor/market", "Telepuan Marketi"],
  ["/teleskor/ayarlar", "Uygulama Ayarları"],
  ["/teleskor/sozlesme", "Sözleşmeler"],
  ["/teleskor/denetim", "Denetim Kaydı"],
  ["/teleskor/saglik", "Sistem Sağlığı"],
  ["/teleskor/motor", "Motor"],
  ["/settings", "Panel Ayarları"],
];

function pageTitle(pathname: string): string {
  const bulunan = BASLIKLAR.find(([onek]) => pathname === onek || pathname.startsWith(onek + "/"));
  return bulunan ? bulunan[1] : "Yönetim Paneli";
}

export default function Topbar({ user }: { user: AppUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const menu = useMobilMenu();

  // Canlı tarih & saat (topbar ortası). SSR/hydration uyuşmazlığı olmasın diye
  // başlangıçta null; mount sonrası saniyede bir güncellenir.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const title = pageTitle(pathname);
  const roleBadge = user.role === "ADMIN" ? "Yönetici" : user.role;

  const initials = gorunenAd(user)
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const timeStr = now
    ? now.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--:--";
  const dateStr = now
    ? now.toLocaleDateString("tr-TR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  async function logout() {
    setBusy(true);
    await apiLogout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="topbar">
      {/* Yalnız dar ekranda görünür (CSS): kenar çubuğu çekmecesini açar. */}
      <button className="menu-dugmesi" onClick={menu.ac} aria-label="Menüyü aç" title="Menü">
        <Menu size={20} />
      </button>
      <div className="topbar-title">{title}</div>

      {/* Hızlı erişim — canlı sitedeki haberler sayfası (yayın sonrası kontrol). */}
      <nav className="topbar-quick" aria-label="Hızlı erişim">
        <a
          href="https://www.teleskor.com.tr/haber"
          target="_blank"
          rel="noopener noreferrer"
          className="topbar-quick-link"
        >
          <ExternalLink size={15} />
          Haberler Sayfası
        </a>
      </nav>

      <div className="topbar-clock" suppressHydrationWarning>
        <span className="clock-time">{timeStr}</span>
        <span className="clock-date">{dateStr}</span>
      </div>

      <div className="topbar-user">
        <div className="user-chip">
          <div className="user-avatar">{initials}</div>
          <div className="user-meta">
            <div className="name">{gorunenAd(user)}</div>
            <span className="user-role-badge">{roleBadge}</span>
          </div>
        </div>
        <button
          className="topbar-logout"
          onClick={logout}
          disabled={busy}
          title="Çıkış Yap"
          aria-label="Çıkış Yap"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
