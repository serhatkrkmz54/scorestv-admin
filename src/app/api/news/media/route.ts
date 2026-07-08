import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
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
