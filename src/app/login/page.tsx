import { redirect } from "next/navigation";
import { resolveUser, isEditorOrAdmin } from "@/lib/auth-server";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

/**
 * Giriş sayfası. Zaten geçerli EDITOR/ADMIN oturumu varsa panele yönlendir.
 * Aksi hâlde giriş formunu göster. (middleware login rotasını atlar.)
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const user = await resolveUser();
  if (isEditorOrAdmin(user)) {
    redirect("/");
  }

  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/";

  return (
    <div className="login-shell">
      <LoginForm next={next} />
    </div>
  );
}
