import { NextResponse } from "next/server";
import { resolveUserAllowRefresh, panelYetkili } from "@/lib/auth-server";

export async function GET() {
  // Route handler → cookie yazılabilir; süresi dolmuşsa refresh dener.
  const user = await resolveUserAllowRefresh();
  if (!user) {
    return NextResponse.json({ message: "Oturum yok." }, { status: 401 });
  }
  if (!panelYetkili(user)) {
    return NextResponse.json(
      { message: "Panel erişim yetkisi yok." },
      { status: 403 },
    );
  }
  return NextResponse.json(user);
}
