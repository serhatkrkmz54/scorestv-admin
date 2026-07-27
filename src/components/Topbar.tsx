"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Newspaper, PlusCircle } from "lucide-react";
import { apiLogout } from "@/lib/api-client";
import type { AppUser } from "@/lib/types";

/** Rota → sayfa başlığı. Liste dışı rotalar için basit eşleme. */
function pageTitle(pathname: string): string {
  if (pathname === "/news/new") return "Yeni Haber";
  if (pathname.endsWith("/edit")) return "Haberi Düzenle";
  if (pathname.endsWith("/preview")) return "Önizleme";
  return "Haberler";
}

export default function Topbar({ user }: { user: AppUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

  // Canlı tarih & saat (topbar ortası). SSR/hydration uyuşmazlığı olmasın diye
  // başlangıçta null; mount sonrası saniyede bir güncellenir.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const title = pageTitle(pathname);
  const roleBadge = user.role === "ADMIN" ? "Süper Admin" : "Editör";

  const initials = (user.displayName || user.email)
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
      <div className="topbar-title">{title}</div>

      {/* Hızlı erişim — en sık kullanılan sayfalar (sidebar akordiyonu kapalıyken de tek tık). */}
      <nav className="topbar-quick" aria-label="Hızlı erişim">
        <Link href="/news" className="topbar-quick-link">
          <Newspaper size={15} />
          Haberler
        </Link>
        <Link href="/news/new" className="topbar-quick-link accent">
          <PlusCircle size={15} />
          Yeni Haber
        </Link>
      </nav>

      <div className="topbar-clock" suppressHydrationWarning>
        <span className="clock-time">{timeStr}</span>
        <span className="clock-date">{dateStr}</span>
      </div>

      <div className="topbar-user">
        <div className="user-chip">
          <div className="user-avatar">{initials}</div>
          <div className="user-meta">
            <div className="name">{user.displayName || user.email}</div>
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
