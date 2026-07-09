import { resolveUser } from "@/lib/auth-server";
import NewsListClient from "@/components/NewsListClient";

export const dynamic = "force-dynamic";

/** Haber Listesi. Sil butonu yalnız ADMIN'e görünür. */
export default async function NewsListPage() {
  const user = await resolveUser();
  const isAdmin = user?.role === "ADMIN";
  return <NewsListClient isAdmin={isAdmin} />;
}
