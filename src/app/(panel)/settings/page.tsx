import { redirect } from "next/navigation";
import { resolveUser } from "@/lib/auth-server";
import SettingsClient from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

/**
 * Ayarlar sayfası. (panel) layout zaten EDITOR/ADMIN kapısını uygular; burada
 * çözülen kullanıcıyı SettingsClient'a geçiririz (ADMIN'e özel bölümler rol'e
 * göre koşullu render edilir).
 */
export default async function SettingsPage() {
  const user = await resolveUser();
  if (!user) redirect("/login");
  return <SettingsClient user={user} />;
}
