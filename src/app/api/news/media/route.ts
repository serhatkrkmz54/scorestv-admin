import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { MediaItem } from "@/lib/types";

/**
 * Medya kütüphanesi (GET) → backend GET /api/v1/admin/news/media?limit
 * Yüklenmiş haber görsellerini (en yeni üstte) döndürür. EDITOR/ADMIN;
 * token forward edilir, 401'de bir kez refresh+retry yapılır.
 */
export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get("limit");
  const qs = limit ? `?limit=${encodeURIComponent(limit)}` : "";
  const r = await authorizedBackendJson<MediaItem[]>(
    `/api/v1/admin/news/media${qs}`,
  );

  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Medya listelenemedi." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}

/**
 * Görseli sil (DELETE) → backend DELETE /api/v1/admin/news/media?key=...
 * Panel, görsel bir habere bağlıysa kullanıcıyı önceden uyarır; onaydan sonra
 * bu çağrılır.
 */
export async function DELETE(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ message: "key gerekli." }, { status: 400 });
  }
  const r = await authorizedBackendJson(
    `/api/v1/admin/news/media?key=${encodeURIComponent(key)}`,
    { method: "DELETE" },
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok) {
    return NextResponse.json(
      r.body ?? { message: "Görsel silinemedi." },
      { status: r.status },
    );
  }
  return new NextResponse(null, { status: 204 });
}
