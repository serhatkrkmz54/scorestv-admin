import { resolveUser } from "@/lib/auth-server";
import NewsListClient from "@/components/NewsListClient";

export const dynamic = "force-dynamic";

/** Haber Listesi — panelin ana sayfası. Sil butonu yalnız ADMIN'e görünür. */
export default async function HomePage() {
  const user = await resolveUser();
  const isAdmin = user?.role === "ADMIN";
  return <NewsListClient isAdmin={isAdmin} />;
}
