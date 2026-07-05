"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, LogOut } from "lucide-react";
import { apiLogout } from "@/lib/api-client";
import type { AppUser } from "@/lib/types";
import { useTopbarSearchValue } from "@/lib/topbar-search";

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
  const [search, setSearch] = useTopbarSearchValue();

  const isList = pathname === "/";
  const title = pageTitle(pathname);
  const roleBadge = user.role === "ADMIN" ? "Süper Admin" : "Editör";

  const initials = (user.displayName || user.email)
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const onSearch = useCallback(
    (v: string) => {
      setSearch(v);
      // Liste dışındaysak, arama yazılınca listeye dön (arama orada uygulanır).
      if (!isList && v.trim()) router.push("/");
    },
    [setSearch, isList, router],
  );

  async function logout() {
    setBusy(true);
    await apiLogout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="topbar">
      <div className="topbar-title">{title}</div>

      <div className="topbar-search">
        <Search className="icon" size={18} />
        <input
          type="search"
          placeholder="Haberlerde ara..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
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
