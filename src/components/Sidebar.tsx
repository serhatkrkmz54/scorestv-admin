"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Newspaper,
  PlusCircle,
  Image as ImageIcon,
  Settings,
  LogOut,
} from "lucide-react";
import { apiLogout } from "@/lib/api-client";
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

  const isNews =
    pathname === "/" ||
    (pathname.startsWith("/news") && !pathname.endsWith("/new"));
  const isNew = pathname === "/news/new";

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
          <Newspaper size={20} />
        </div>
        <div>
          <div className="brand-name">
            Scores<span className="accent">TV</span>
          </div>
          <small>Editör Paneli</small>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">Yönetim</div>
        <Link href="/" className={`nav-item ${isNews ? "active" : ""}`}>
          <Newspaper className="icon" size={22} />
          Haberler
        </Link>
        <Link href="/news/new" className={`nav-item ${isNew ? "active" : ""}`}>
          <PlusCircle className="icon" size={22} />
          Yeni Haber
        </Link>

        <div className="sidebar-section">Yakında</div>
        <span
          className="nav-item disabled"
          aria-disabled
          title="Yakında eklenecek"
        >
          <ImageIcon className="icon" size={22} />
          Medya
        </span>
        <span
          className="nav-item disabled"
          aria-disabled
          title="Yakında eklenecek"
        >
          <Settings className="icon" size={22} />
          Ayarlar
        </span>
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
