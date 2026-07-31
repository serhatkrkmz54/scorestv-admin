"use client";

import { useEffect, useState } from "react";

/**
 * Canlı geri sayım — hedef ana kalan süreyi "2g 5s 12d" biçiminde gösterir,
 * dakikada bir tazelenir (son saatte saniyede bir). Hedef geçtiyse
 * `passedLabel` gösterilir.
 */
export default function Countdown({
  target,
  prefix,
  passedLabel = "geçti",
}: {
  target: string | null | undefined;
  prefix?: string;
  passedLabel?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  const ts = target ? new Date(target).getTime() : NaN;
  const remainMs = ts - now;
  // Son saatte saniyelik, öncesinde dakikalık tick (gereksiz render olmasın).
  const tickMs = remainMs > 0 && remainMs < 3_600_000 ? 1000 : 60_000;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  if (!target || Number.isNaN(ts)) return null;
  return (
    <span suppressHydrationWarning>
      {prefix}
      {remainMs <= 0 ? passedLabel : formatRemain(remainMs)}
    </span>
  );
}

function formatRemain(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86_400);
  const h = Math.floor((totalSec % 86_400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}g ${h}s ${m}d`;
  if (h > 0) return `${h}s ${m}d`;
  if (m > 0) return `${m}d ${s}sn`;
  return `${s}sn`;
}
