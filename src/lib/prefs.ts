"use client";

// İstemci tarafı (localStorage) kullanıcı tercihleri — backend YOK.
// İki tercih burada toplanır:
//   1) Yeni haberler için varsayılan bildirim modu (Ayarlar → Bildirim
//      Varsayılanları; NewsForm yeni haberde bunu okur).
//   2) Panel teması (Ayarlar → Panel Teması; <html data-theme> ile uygulanır).
// Tüm okumalar SSR güvenlidir (window yoksa varsayılan döner).

// ---- Bildirim varsayılanı ----
export type NotifyDefault = "none" | "favorites" | "all";
const NOTIFY_KEY = "stv.notifyDefault";
const NOTIFY_VALUES: NotifyDefault[] = ["none", "favorites", "all"];

export function getNotifyDefault(): NotifyDefault {
  if (typeof window === "undefined") return "none";
  try {
    const v = window.localStorage.getItem(NOTIFY_KEY);
    if (v && (NOTIFY_VALUES as string[]).includes(v)) return v as NotifyDefault;
  } catch {
    // localStorage erişilemez (gizli mod vb.) — varsayılana düş.
  }
  return "none";
}

export function setNotifyDefault(v: NotifyDefault): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NOTIFY_KEY, v);
  } catch {
    // sessizce geç
  }
}

// ---- Panel teması ----
export type ThemePref = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";
const THEME_KEY = "stv.theme";
const THEME_VALUES: ThemePref[] = ["dark", "light", "system"];

// Hiçbir şey kayıtlı değilse panelin MEVCUT görünümü (açık tema) korunur.
const DEFAULT_THEME: ThemePref = "light";

export function getThemePref(): ThemePref {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    if (v && (THEME_VALUES as string[]).includes(v)) return v as ThemePref;
  } catch {
    // sessizce geç
  }
  return DEFAULT_THEME;
}

export function setThemePref(v: ThemePref): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_KEY, v);
  } catch {
    // sessizce geç
  }
}

/** "system" tercihini işletim sistemine göre koyu/açık'a indirger. */
export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref === "system") {
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
    return "light";
  }
  return pref;
}

/** Seçili temayı <html data-theme> üzerine uygular (canlı geçiş). */
export function applyTheme(pref: ThemePref): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolveTheme(pref);
}
