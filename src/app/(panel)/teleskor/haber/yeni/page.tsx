import TeleskorHaberFormu from "@/components/TeleskorHaberFormu";
import { haberKapisi } from "../_kapi";

export const dynamic = "force-dynamic";

export default async function TeleskorYeniHaberPage() {
  const engel = await haberKapisi();
  return engel ?? <TeleskorHaberFormu ilk={null} />;
}
