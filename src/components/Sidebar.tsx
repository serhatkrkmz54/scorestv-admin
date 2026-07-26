"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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
  Users,
  Radio,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { apiLogout, apiContactUnreadCount } from "@/lib/api-client";
import type { AppUser } from "@/lib/types";

const ROLE_TR: Record<string, string> = {
  ADMIN: "Süper Admin",
  EDITOR: "Editör",
  USER: "Kullanıcı",
};

type SectionId = "genel" | "icerik" | "topluluk" | "sistem";

/** Akordiyon açık/kapalı durumunun localStorage anahtarı.
 * v2: varsayılan "yalnız Genel + İçerik açık" oldu — eski kayıtlar geçersiz. */
const NAV_OPEN_KEY = "stv-admin-nav-open-v2";

const DEFAULT_OPEN: Record<SectionId, boolean> = {
  genel: true,
  icerik: true,
  topluluk: false,
  sistem: false,
};

/** Aktif rotanın hangi bölümde olduğu — o bölüm otomatik açılır. */
function sectionOfPath(pathname: string): SectionId {
  if (pathname === "/") return "genel";
  if (
    pathname.startsWith("/news") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/slider") ||
    pathname.startsWith("/media")
  ) {
    return "icerik";
  }
  if (
    pathname.startsWith("/users") ||
    pathname.startsWith("/comments") ||
    pathname.startsWith("/reporters") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/game")
  ) {
    return "topluluk";
  }
  return "sistem";
}

/** Akordiyon bölümü — başlık tıklanınca içerik açılıp kapanır. */
function NavSection({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  open: boolean;
  onToggle: (id: SectionId) => void;
  children: ReactNode;
}) {
  return (
    <div className="nav-section">
      <button
        type="button"
        className="sidebar-section nav-section-toggle"
        onClick={() => onToggle(id)}
        aria-expanded={open}
        aria-controls={`nav-group-${id}`}
      >
        <span>{title}</span>
        <ChevronDown size={13} className={`nav-section-chev ${open ? "open" : ""}`} />
      </button>
      <div id={`nav-group-${id}`} className={`nav-group ${open ? "" : "closed"}`}>
        <div className="nav-group-inner">{children}</div>
      </div>
    </div>
  );
}

export default function Sidebar({ user }: { user: AppUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState<Record<SectionId, boolean>>(DEFAULT_OPEN);

  // Kayıtlı akordiyon durumunu yükle (bir kez, mount'ta).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(NAV_OPEN_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Record<SectionId, boolean>>;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage'dan tek seferlik hidrasyon (kasıtlı)
        setOpen({ ...DEFAULT_OPEN, ...saved });
      }
    } catch {
      /* bozuk kayıt — varsayılan kalsın */
    }
  }, []);

  // Aktif sayfanın bölümü her zaman açık kalsın (gezinince kaybolmasın).
  useEffect(() => {
    const active = sectionOfPath(pathname);
    setOpen((o) => (o[active] ? o : { ...o, [active]: true }));
  }, [pathname]);

  function toggle(id: SectionId) {
    setOpen((o) => {
      const next = { ...o, [id]: !o[id] };
      try {
        localStorage.setItem(NAV_OPEN_KEY, JSON.stringify(next));
      } catch {
        /* localStorage yoksa sessiz */
      }
      return next;
    });
  }

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
  const isUsers = pathname.startsWith("/users");
  const isReporters = pathname.startsWith("/reporters");

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
        <NavSection id="genel" title="Genel" open={open.genel} onToggle={toggle}>
          <Link href="/" className={`nav-item ${isDashboard ? "active" : ""}`}>
            <LayoutDashboard className="icon" size={22} />
            Panel
          </Link>
        </NavSection>

        <NavSection id="icerik" title="İçerik" open={open.icerik} onToggle={toggle}>
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
        </NavSection>

        <NavSection id="topluluk" title="Topluluk" open={open.topluluk} onToggle={toggle}>
          {user.role === "ADMIN" && (
            <Link href="/users" className={`nav-item ${isUsers ? "active" : ""}`}>
              <Users className="icon" size={22} />
              Üyeler
            </Link>
          )}
          <Link href="/comments" className={`nav-item ${isComments ? "active" : ""}`}>
            <MessageSquare className="icon" size={22} />
            Yorumlar
          </Link>
          <Link
            href="/reporters"
            className={`nav-item ${isReporters ? "active" : ""}`}
          >
            <Radio className="icon" size={22} />
            Muhabirler
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
        </NavSection>

        <NavSection id="sistem" title="Sistem" open={open.sistem} onToggle={toggle}>
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
        </NavSection>
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
