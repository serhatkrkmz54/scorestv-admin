"use client";

import { useEffect, useState } from "react";
import {
  getNotifyDefault,
  setNotifyDefault,
  type NotifyDefault,
} from "@/lib/prefs";

const OPTIONS: { value: NotifyDefault; label: string; hint: string }[] = [
  {
    value: "none",
    label: "Kimseye gönderme",
    hint: "Yeni haberde bildirim varsayılan olarak kapalı gelir.",
  },
  {
    value: "favorites",
    label: "İlgili favorilere",
    hint: "Habere bağlı takım/ligleri favorileyenlere gönderilir.",
  },
  {
    value: "all",
    label: "Herkese",
    hint: "Tüm kullanıcılara push gönderilir.",
  },
];

/**
 * Bildirim Varsayılanları (tüm roller, yalnız istemci). Yeni haber formunun
 * (NewsForm) push modunu başlatacağı varsayılanı localStorage'da tutar. Backend
 * yok. Değer hidrasyon uyuşmazlığını önlemek için mount sonrası okunur.
 */
export default function NotificationDefaultsSection() {
  const [value, setValue] = useState<NotifyDefault>("none");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(getNotifyDefault());
  }, []);

  function choose(v: NotifyDefault) {
    setValue(v);
    setNotifyDefault(v);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div className="card card-pad">
      <div className="section-title">Bildirim Varsayılanları</div>
      <div className="section-hint">
        Yeni haber oluştururken bildirim modu varsayılan olarak nasıl gelsin? Bu
        tercih yalnızca bu tarayıcıda saklanır; mevcut haberleri düzenlerken
        etkilemez.
      </div>

      <div className="radio-row" style={{ flexDirection: "column", gap: 8 }}>
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`radio-opt ${value === o.value ? "selected" : ""}`}
          >
            <input
              type="radio"
              name="notify-default"
              checked={value === o.value}
              onChange={() => choose(o.value)}
            />
            <span>
              <span style={{ fontWeight: 600 }}>{o.label}</span>
              <span className="hint" style={{ display: "block", marginTop: 2 }}>
                {o.hint}
              </span>
            </span>
          </label>
        ))}
      </div>

      {saved && (
        <div className="hint" style={{ marginTop: 10 }}>
          Kaydedildi.
        </div>
      )}
    </div>
  );
}
