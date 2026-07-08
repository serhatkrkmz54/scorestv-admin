import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { MediaUsage } from "@/lib/types";

/**
 * Bir görselin hangi haber(ler)de kullanıldığı (GET) →
 * backend GET /api/v1/admin/news/media/usage?key=...
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ message: "key gerekli." }, { status: 400 });
  }
  const r = await authorizedBackendJson<MediaUsage[]>(
    `/api/v1/admin/news/media/usage?key=${encodeURIComponent(key)}`,
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Kullanım bilgisi alınamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
