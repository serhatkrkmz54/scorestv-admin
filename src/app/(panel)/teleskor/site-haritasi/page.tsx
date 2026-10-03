import { teleskorConfigured } from "@/lib/teleskor";
import TeleskorSiteHaritasiClient from "@/components/TeleskorSiteHaritasiClient";

export const dynamic = "force-dynamic";

/**
 * Site Haritası — ADMIN ve SEO rolü (layout'un kapısı SEO'yu yalnız buraya
 * ve hesap ayarına bırakır; yetkiyi Teleskor kendisi de denetler).
 */
export default function TeleskorSiteHaritasiPage() {
  if (!teleskorConfigured()) {
    return (
      <div className="card card-pad">
        <div className="alert alert-error">
          <b>Teleskor bağlantısı kurulu değil.</b>
        </div>
      </div>
    );
  }
  return <TeleskorSiteHaritasiClient />;
}
