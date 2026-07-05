import NewNewsClient from "@/components/NewNewsClient";

export const dynamic = "force-dynamic";

/** Yeni haber sayfası. ?copyFrom=ID varsa o haberi kopyalayarak başlar. */
export default async function NewNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ copyFrom?: string }>;
}) {
  const sp = await searchParams;
  const copyFrom = sp.copyFrom && /^\d+$/.test(sp.copyFrom) ? Number(sp.copyFrom) : null;
  return <NewNewsClient copyFrom={copyFrom} />;
}
