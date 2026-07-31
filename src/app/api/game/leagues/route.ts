import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { LeagueGuideRow } from "@/lib/types";

/**
 * GET /api/v1/admin/api-football/leagues/search?q= — lig rehberi/arama
 * (ID + güncel sezon + ülke). Oyun yarışması formundaki lig seçici kullanır.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);
  const r = await authorizedBackendJson<LeagueGuideRow[]>(
    `/api/v1/admin/api-football/leagues/search?q=${encodeURIComponent(q)}`,
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
