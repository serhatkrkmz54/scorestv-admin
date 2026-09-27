import TeleskorHaberFormu from "@/components/TeleskorHaberFormu";
import { teleskorJson } from "@/lib/teleskor";
import type { TeleskorHaberDetayi } from "@/lib/types";
import { haberKapisi } from "../_kapi";

export const dynamic = "force-dynamic";

export default async function TeleskorHaberDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const engel = await haberKapisi();
  if (engel) return engel;
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) {
    return <div className="card card-pad"><div className="alert alert-error">Geçersiz haber.</div></div>;
  }
  const r = await teleskorJson<TeleskorHaberDetayi>(`/api/v1/admin/haber/${id}`);
  if (!r.ok || !r.body) {
    return (
      <div className="card card-pad">
        <div className="alert alert-error">{r.status === 404 ? "Haber bulunamadı." : "Haber alınamadı."}</div>
      </div>
    );
  }
  return <TeleskorHaberFormu key={`${r.body.id}-${r.body.guncelleme ?? ""}`} ilk={r.body} />;
}
