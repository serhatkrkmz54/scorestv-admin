import { redirect } from "next/navigation";
import { resolveUser, panelYetkili } from "@/lib/auth-server";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { MobilMenuKabugu } from "@/components/MobilMenu";

export const dynamic = "force-dynamic";

/**
 * Panel layout — SUNUCU TARAFI ROL KAPISI. Teleskor `/api/v1/auth/me` ile
 * çözülen kullanıcı ADMIN değilse (ya da oturum yoksa) /login'e yönlendirir.
 * middleware yalnız çerez varlığına bakar; rol burada, asıl yetki Teleskor'da.
 */
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await resolveUser();
  if (!panelYetkili(user)) {
    redirect("/login");
  }

  return (
    <MobilMenuKabugu>
      <Sidebar user={user!} />
      <div className="main-area">
        <Topbar user={user!} />
        <div className="page-content">{children}</div>
      </div>
    </MobilMenuKabugu>
  );
}
