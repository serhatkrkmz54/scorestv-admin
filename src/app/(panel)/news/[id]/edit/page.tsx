import { notFound } from "next/navigation";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { NewsDetail } from "@/lib/types";
import EditNewsClient from "@/components/EditNewsClient";

export const dynamic = "force-dynamic";

/** Haber düzenleme — sunucu tarafında admin detayını çeker, forma verir. */
export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const r = await authorizedBackendJson<NewsDetail>(`/api/v1/admin/news/${id}`);
  if (r.unauthorized) {
    // Layout guard bunu genelde yakalar; yine de güvenli taraf.
    notFound();
  }
  if (!r.ok || !r.body) {
    notFound();
  }

  return <EditNewsClient detail={r.body} />;
}
