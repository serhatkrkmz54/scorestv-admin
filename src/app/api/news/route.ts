import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { NewsDetail, NewsPageResponse, NewsRequest } from "@/lib/types";

/**
 * Haber liste (GET) + yeni haber (POST).
 * Backend:
 *   GET  /api/v1/admin/news?status&lang&category&q&page&size
 *   POST /api/v1/admin/news  (CreateNewsRequest)
 * İkisi de EDITOR/ADMIN yetkisi ister; token forward edilir.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const qs = new URLSearchParams();
  // Backend'in tanıdığı param'ları geçirgen bırak.
  for (const key of ["status", "lang", "category", "q", "page", "size"]) {
    const v = sp.get(key);
    if (v !== null && v !== "") qs.set(key, v);
  }

  const path = `/api/v1/admin/news${qs.toString() ? `?${qs.toString()}` : ""}`;
  const r = await authorizedBackendJson<NewsPageResponse>(path);

  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Haberler alınamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}

export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  let payload: NewsRequest;
  try {
    payload = (await req.json()) as NewsRequest;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await authorizedBackendJson<NewsDetail>("/api/v1/admin/news", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Haber oluşturulamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body, { status: 201 });
}
