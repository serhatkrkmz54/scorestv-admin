// Tarih/sayı biçimlendirme yardımcıları (TR yerel).

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


/**
 * "12 dk önce", "3 saat önce", "5 gün önce"; 60 günden eskiyse ya da tarih
 * yoksa null (yanında zaten tam tarih yazıyor). Gelecek bir an da null.
 */
export function goreliZaman(iso: string | null | undefined, simdi = Date.now()): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  const dk = Math.floor((simdi - t) / 60000);
  if (dk < 0) return null;
  if (dk < 1) return "az önce";
  if (dk < 60) return `${dk} dk önce`;
  const saat = Math.floor(dk / 60);
  if (saat < 24) return `${saat} saat önce`;
  const gun = Math.floor(saat / 24);
  if (gun <= 60) return `${gun} gün önce`;
  return null;
}
