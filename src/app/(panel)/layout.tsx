import { redirect } from "next/navigation";
import { resolveUser, isEditorOrAdmin } from "@/lib/auth-server";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export const dynamic = "force-dynamic";

/**
 * Panel layout — SUNUCU TARAFI ROL KAPISI. /api/v1/auth/me üzerinden çözülen
 * kullanıcı EDITOR veya ADMIN değilse (ya da oturum yoksa) /login'e yönlendirir.
 * middleware yalnızca çerez varlığını kontrol eder; asıl rol doğrulaması burada.
 */
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await resolveUser();
  if (!isEditorOrAdmin(user)) {
    redirect("/login");
  }

  return (
    <div className="app-shell">
      <Sidebar user={user!} />
      <div className="main-area">
        <Topbar user={user!} />
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}
