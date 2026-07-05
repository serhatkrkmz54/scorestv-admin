"use client";

// Topbar araması ile Haber Listesi araması arasında hafif köprü. Sadece UI
// durumu; API/veri akışını DEĞİŞTİRMEZ. Topbar arama kutusuna yazılan metin,
// liste sayfasındaki mevcut arama state'ine bir olay üzerinden iletilir.
// Liste dışı sayfalarda topbar araması yalnızca liste rotasına yönlendirir.

import { useEffect, useState } from "react";

type Listener = (q: string) => void;

const listeners = new Set<Listener>();
let current = "";

export function setTopbarSearch(q: string) {
  current = q;
  for (const l of listeners) l(q);
}

export function getTopbarSearch() {
  return current;
}

/** Liste bileşeni bunu kullanarak topbar aramasına abone olur. */
export function useTopbarSearchSubscription(onChange: (q: string) => void) {
  useEffect(() => {
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, [onChange]);
}

/** Topbar arama kutusu için kontrollü değer kancası. */
export function useTopbarSearchValue(): [string, (q: string) => void] {
  const [value, setValue] = useState(current);
  useEffect(() => {
    const l: Listener = (q) => setValue(q);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return [value, setTopbarSearch];
}
