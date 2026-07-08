"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import {
  getThemePref,
  setThemePref,
  applyTheme,
  type ThemePref,
} from "@/lib/prefs";

const OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Açık", icon: Sun },
  { value: "dark", label: "Koyu", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
];

/**
 * Panel Teması (tüm roller, yalnız istemci). Açık/Koyu/Sistem seçimi
 * localStorage'da (stv.theme) saklanır ve <html data-theme> üzerine canlı
 * uygulanır. Sayfa yüklenirken flash'ı önleyen script layout.tsx <head>'inde.
 */
export default function ThemeSection() {
  const [value, setValue] = useState<ThemePref>("light");

  useEffect(() => {
    setValue(getThemePref());
  }, []);

  // "Sistem" seçiliyken OS teması değişirse canlı takip et.
  useEffect(() => {
    if (value !== "system" || typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [value]);

  function choose(v: ThemePref) {
    setValue(v);
    setThemePref(v);
    applyTheme(v);
  }

  return (
    <div className="card card-pad">
      <div className="section-title">Panel Teması</div>
      <div className="section-hint">
        Arayüz temasını seçin. Tercihiniz bu tarayıcıda saklanır.
      </div>

      <div className="radio-row">
        {OPTIONS.map((o) => {
          const Icon = o.icon;
          return (
            <label
              key={o.value}
              className={`radio-opt ${value === o.value ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="panel-theme"
                checked={value === o.value}
                onChange={() => choose(o.value)}
              />
              <Icon size={17} />
              {o.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
