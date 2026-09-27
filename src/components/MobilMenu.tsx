"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * MOBİL MENÜ — dar ekranda (≤ 900 px) kenar çubuğu çekmeceye döner.
 *
 * Kabuk (`.app-shell`) bu bileşende: çekmece açıkken `menu-acik` sınıfı
 * alır, kenar çubuğu soldan kayar, arkada perde çıkar. Üst çubuktaki menü
 * düğmesi açar; perdeye dokunmak, Esc ve sayfa değişimi (Sidebar) kapatır.
 * Geniş ekranda sınıfın hiçbir etkisi yok (CSS yalnız medya sorgusunda).
 */

type MobilMenu = { acik: boolean; ac: () => void; kapat: () => void };

const Baglam = createContext<MobilMenu>({ acik: false, ac: () => {}, kapat: () => {} });

export function useMobilMenu(): MobilMenu {
  return useContext(Baglam);
}

export function MobilMenuKabugu({ children }: { children: ReactNode }) {
  const [acik, setAcik] = useState(false);
  const ac = useCallback(() => setAcik(true), []);
  const kapat = useCallback(() => setAcik(false), []);

  // Açıkken arkadaki sayfa kaymasın; Esc kapatır.
  useEffect(() => {
    if (!acik) return;
    const onceki = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tus = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAcik(false);
    };
    window.addEventListener("keydown", tus);
    return () => {
      document.body.style.overflow = onceki;
      window.removeEventListener("keydown", tus);
    };
  }, [acik]);

  return (
    <Baglam.Provider value={{ acik, ac, kapat }}>
      <div className={`app-shell${acik ? " menu-acik" : ""}`}>
        {children}
        <div className="menu-perde" onClick={kapat} aria-hidden="true" />
      </div>
    </Baglam.Provider>
  );
}
