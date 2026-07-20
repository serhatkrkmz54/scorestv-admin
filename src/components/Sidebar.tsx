"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Newspaper,
  PlusCircle,
  Bell,
  BellRing,
  Image as ImageIcon,
  Settings,
  MessageSquare,
  ScrollText,
  LayoutTemplate,
  CalendarClock,
  Mail,
  Gamepad2,
  LogOut,
} from "lucide-react";
import { apiLogout, apiContactUnreadCount } from "@/lib/api-client";
import type { AppUser } from "@/lib/types";

const ROLE_TR: Record<string, string> = {
  ADMIN: "Süper Admin",
  EDITOR: "Editör",
  USER: "Kullanıcı",
};

export default function Sidebar({ user }: { user: AppUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (user.role !== "ADMIN") return;
    let alive = true;
    apiContactUnreadCount()
      .then((n) => {
        if (alive) setUnread(n);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user.role]);

  const isDashboard = pathname === "/";
  const isNews = pathname.startsWith("/news") && !pathname.endsWith("/new");
  const isNew = pathname === "/news/new";
  const isNotifications = pathname === "/notifications";
  const isDeliveries = pathname.startsWith("/notifications/deliveries");
  const isMedia = pathname.startsWith("/media");
  const isSettings = pathname.startsWith("/settings");
  const isComments = pathname.startsWith("/comments");
  const isSlider = pathname.startsWith("/slider");
  const isCalendar = pathname.startsWith("/calendar");
  const isAudit = pathname.startsWith("/audit");
  const isMessages = pathname.startsWith("/messages");
  const isGame = pathname.startsWith("/game");

  const initials = (user.displayName || user.email)
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function logout() {
    setBusy(true);
    await apiLogout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/app_icon.png" alt="Scores TV" />
        </div>
        <div>
          <div className="brand-name">
            Scores<span className="accent">TV</span>
          </div>
          <small>Editör Paneli</small>
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* ---- Genel ---- */}
        <div className="sidebar-section">Genel</div>
        <Link href="/" className={`nav-item ${isDashboard ? "active" : ""}`}>
          <LayoutDashboard className="icon" size={22} />
          Panel
        </Link>

        {/* ---- İçerik ---- */}
        <div className="sidebar-section">İçerik</div>
        <Link href="/news" className={`nav-item ${isNews ? "active" : ""}`}>
          <Newspaper className="icon" size={22} />
          Haberler
        </Link>
        <Link href="/news/new" className={`nav-item ${isNew ? "active" : ""}`}>
          <PlusCircle className="icon" size={22} />
          Yeni Haber
        </Link>
        <Link href="/calendar" className={`nav-item ${isCalendar ? "active" : ""}`}>
          <CalendarClock className="icon" size={22} />
          Takvim
        </Link>
        <Link href="/slider" className={`nav-item ${isSlider ? "active" : ""}`}>
          <LayoutTemplate className="icon" size={22} />
          Slider
        </Link>
        <Link href="/media" className={`nav-item ${isMedia ? "active" : ""}`}>
          <ImageIcon className="icon" size={22} />
          Medya
        </Link>

        {/* ---- Topluluk ---- */}
        <div className="sidebar-section">Topluluk</div>
        <Link href="/comments" className={`nav-item ${isComments ? "active" : ""}`}>
          <MessageSquare className="icon" size={22} />
          Yorumlar
        </Link>
        {user.role === "ADMIN" && (
          <Link href="/messages" className={`nav-item ${isMessages ? "active" : ""}`}>
            <Mail className="icon" size={22} />
            İletişim
            {unread > 0 && <span className="nav-badge">{unread}</span>}
          </Link>
        )}
        <Link
          href="/notifications"
          className={`nav-item ${isNotifications ? "active" : ""}`}
        >
          <Bell className="icon" size={22} />
          Bildirim Gönder
        </Link>
        <Link
          href="/notifications/deliveries"
          className={`nav-item ${isDeliveries ? "active" : ""}`}
        >
          <BellRing className="icon" size={22} />
          Bildirim Takip
        </Link>
        {user.role === "ADMIN" && (
          <Link href="/game" className={`nav-item ${isGame ? "active" : ""}`}>
            <Gamepad2 className="icon" size={22} />
            Oyun
          </Link>
        )}

        {/* ---- Sistem ---- */}
        <div className="sidebar-section">Sistem</div>
        <Link href="/audit" className={`nav-item ${isAudit ? "active" : ""}`}>
          <ScrollText className="icon" size={22} />
          Denetim
        </Link>
        <Link
          href="/settings"
          className={`nav-item ${isSettings ? "active" : ""}`}
        >
          <Settings className="icon" size={22} />
          Ayarlar
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">{initials}</div>
          <div className="meta">
            <div className="name">{user.displayName || user.email}</div>
            <div className="role">{ROLE_TR[user.role] ?? user.role}</div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={logout} disabled={busy}>
          <LogOut size={16} />
          {busy ? "Çıkılıyor..." : "Çıkış"}
        </button>
      </div>
    </aside>
  );
}
