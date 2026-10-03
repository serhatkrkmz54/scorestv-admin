import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { resolveUser, panelYetkili } from "@/lib/auth-server";
import { SEO_ACILIS, YOL_BASLIGI, sayfaIzinli } from "@/lib/panel-rol";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { MobilMenuKabugu } from "@/components/MobilMenu";

export const dynamic = "force-dynamic";

/**
 * Panel layout — SUNUCU TARAFI ROL KAPISI. Teleskor `/api/v1/auth/me` ile
 * çözülen kullanıcı ADMIN ya da SEO değilse (ya da oturum yoksa) /login'e
 * yönlendirir. SEO rolü kendi sayfası dışında bir yere girerse oraya döner
 * (yol middleware'in başlığından; başlık yoksa izin yok sayılır).
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
  const yol = (await headers()).get(YOL_BASLIGI) ?? "";
  if (!sayfaIzinli(user!.role, yol)) {
    redirect(SEO_ACILIS);
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
