"use client";

import { useState } from "react";
import type { AppUser } from "@/lib/types";
import ProfileSection from "./ProfileSection";
import EditorsSection from "./EditorsSection";
import NotificationDefaultsSection from "./NotificationDefaultsSection";
import ThemeSection from "./ThemeSection";

type TabKey = "profile" | "editors" | "notify" | "theme";

/**
 * Ayarlar ekranı — sekmeli düzen. ADMIN'e özel "Editör Yönetimi" sekmesi
 * yalnızca user.role === "ADMIN" iken görünür/erişilebilir.
 */
export default function SettingsClient({ user }: { user: AppUser }) {
  const isAdmin = user.role === "ADMIN";
  const [tab, setTab] = useState<TabKey>("profile");

  const tabs: { key: TabKey; label: string; adminOnly?: boolean }[] = [
    { key: "profile", label: "Profil" },
    { key: "editors", label: "Editör Yönetimi", adminOnly: true },
    { key: "notify", label: "Bildirim Varsayılanları" },
    { key: "theme", label: "Panel Teması" },
  ];

  return (
    <div className="stack">
      <div>
        <h2 className="page-title">Ayarlar</h2>
        <div className="muted" style={{ fontSize: 13 }}>
          Profil, tercih ve panel yönetim ayarları.
        </div>
      </div>

      <div className="tabs">
        {tabs
          .filter((t) => !t.adminOnly || isAdmin)
          .map((t) => (
            <button
              key={t.key}
              className={`tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
      </div>

      {tab === "profile" && (
        <div className="stack">
          <ProfileSection user={user} />
        </div>
      )}

      {tab === "editors" && isAdmin && (
        <div className="stack">
          <EditorsSection currentUserId={user.id} />
        </div>
      )}

      {tab === "notify" && (
        <div className="stack">
          <NotificationDefaultsSection />
        </div>
      )}

      {tab === "theme" && (
        <div className="stack">
          <ThemeSection />
        </div>
      )}
    </div>
  );
}
