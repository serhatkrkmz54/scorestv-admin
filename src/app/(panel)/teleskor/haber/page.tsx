import TeleskorHaberListesi from "@/components/TeleskorHaberListesi";
import { haberKapisi } from "./_kapi";

export const dynamic = "force-dynamic";

/** Teleskor → Haberler (V69): Teleskor'un kendi haberleri. */
export default async function TeleskorHaberPage() {
  const engel = await haberKapisi();
  return engel ?? <TeleskorHaberListesi />;
}
