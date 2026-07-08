import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { AdminUserView, CreateEditorRequest } from "@/lib/types";

/**
 * Editör yönetimi (Ayarlar → Editör Yönetimi) — yalnız ADMIN.
 * Backend:
 *   GET  /api/v1/admin/users        → staff (EDITOR/ADMIN) listesi
 *   POST /api/v1/admin/users        → yeni editör/yönetici
 * Rol kontrolü backend'de (@PreAuthorize("hasRole('ADMIN')")); EDITOR 403 alır.
 */
export async function GET() {
  const r = await authorizedBackendJson<AdminUserView[]>("/api/v1/admin/users");

  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Kullanıcılar alınamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}

export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  let payload: CreateEditorRequest;
  try {
    payload = (await req.json()) as CreateEditorRequest;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await authorizedBackendJson<AdminUserView>("/api/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Editör oluşturulamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body, { status: 201 });
}
