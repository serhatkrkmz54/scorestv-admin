import { formatDate, goreliZaman } from "@/lib/format";

/**
 * Tarih + göreli zaman ("3 saat önce"). Değer yoksa "—" (sunucu boş alanı
 * yanıta hiç yazmıyor; "hiç olmadı" ile "alan yok" ayırt edilemez).
 */
export default function Zaman({ iso }: { iso: string | null | undefined }) {
  if (!iso) return <span className="muted">—</span>;
  const goreli = goreliZaman(iso);
  return (
    <>
      <div>{formatDate(iso)}</div>
      {goreli && (
        <div className="muted" style={{ fontSize: 11.5 }}>
          {goreli}
        </div>
      )}
    </>
  );
}
