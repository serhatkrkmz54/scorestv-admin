import { notFound } from "next/navigation";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { NewsDetail } from "@/lib/types";
import BilingualEditor from "@/components/BilingualEditor";

export const dynamic = "force-dynamic";

/**
 * Çift-dil düzenleme — sunucu tarafında çeviri grubunu (TR+EN) çeker, editöre verir.
 */
export default async function BilingualPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const r = await authorizedBackendJson<NewsDetail[]>(
    `/api/v1/admin/news/${id}/group`,
  );
  if (r.unauthorized || !r.ok || !r.body) {
    notFound();
  }

  return <BilingualEditor group={r.body} />;
}
