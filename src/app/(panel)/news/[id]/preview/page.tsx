import Link from "next/link";
import { notFound } from "next/navigation";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { NewsDetail } from "@/lib/types";
import ArticlePreview from "@/components/ArticlePreview";

export const dynamic = "force-dynamic";

/** Önizleme — haberin yayında görüneceği hâli (salt-okunur). */
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const r = await authorizedBackendJson<NewsDetail>(`/api/v1/admin/news/${id}`);
  if (!r.ok || !r.body) notFound();
  const d = r.body;

  return (
    <div className="stack">
      <div className="spread">
        <h2 style={{ margin: 0, fontSize: 20 }}>Önizleme</h2>
        <div className="row">
          <Link href={`/news/${d.id}/edit`} className="btn">
            Düzenle
          </Link>
          <Link href="/" className="btn btn-ghost">
            Listeye Dön
          </Link>
        </div>
      </div>
      <div className="card card-pad">
        <ArticlePreview detail={d} />
      </div>
    </div>
  );
}
