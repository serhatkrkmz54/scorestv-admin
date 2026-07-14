import { NextResponse } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";

/** GET /api/v1/admin/contact/unread-count — okunmamış mesaj sayısı (ADMIN). */
export async function GET() {
  const r = await authorizedBackendJson<{ count: number }>(
    "/api/v1/admin/contact/unread-count",
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json({ count: 0 });
  }
  return NextResponse.json(r.body);
}
