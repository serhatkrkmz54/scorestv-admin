import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";

/**
 * Haber içe aktarmayı ELLE tetikle (POST) — yalnız ADMIN.
 * Backend: POST /api/v1/admin/news/ingest/run — kaynaktan (NewsData) güncel
 * haberleri çeker, yenileri DRAFT olarak açar. Gövde yok. Token forward +
 * same-origin kontrolü.
 */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  const r = await authorizedBackendJson<{ created: number }>(
    "/api/v1/admin/news/ingest/run",
    { method: "POST" },
  );

  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "İçe aktarma başarısız." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
