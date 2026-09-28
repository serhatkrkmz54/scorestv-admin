"use client";

import { useState } from "react";
import type { AppUser } from "@/lib/types";
import ProfileSection from "./ProfileSection";
import ThemeSection from "./ThemeSection";

type TabKey = "profile" | "theme";

/**
 * Ayarlar ekranı — hesabın (Teleskor hesabı) ve panelin görünümü. Yönetici
 * eklemek/çıkarmak Üyeler ekranından (rol değiştir).
 */
export default function SettingsClient({ user }: { user: AppUser }) {
  const [tab, setTab] = useState<TabKey>("profile");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "profile", label: "Hesap" },
    { key: "theme", label: "Panel Teması" },
  ];

  return (
    <div className="stack">
      <div>
        <h2 className="page-title">Ayarlar</h2>
        <div className="muted" style={{ fontSize: 13 }}>
          Hesabın ve panelin görünümü.
        </div>
      </div>

      <div className="tabs">
        {tabs.map((t) => (
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



      {tab === "theme" && (
        <div className="stack">
          <ThemeSection />
        </div>
      )}
    </div>
  );
}
