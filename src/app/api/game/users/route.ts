import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { AdminUserCoin } from "@/lib/types";

/** GET /api/v1/admin/game/users?q= — üye arama (bakiye dahil), ADMIN. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json([]);
  const r = await authorizedBackendJson<AdminUserCoin[]>(
    `/api/v1/admin/game/users?q=${encodeURIComponent(q)}`,
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Arama başarısız." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
