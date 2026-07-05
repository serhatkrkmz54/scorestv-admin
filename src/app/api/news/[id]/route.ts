import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { NewsDetail, NewsRequest } from "@/lib/types";

/**
 * Tek haber: GET (admin detay), PUT (güncelle), DELETE (yalnız ADMIN, soft-delete).
 * Backend:
 *   GET    /api/v1/admin/news/{id}
 *   PUT    /api/v1/admin/news/{id}   (UpdateNewsRequest)
 *   DELETE /api/v1/admin/news/{id}   → 204
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const r = await authorizedBackendJson<NewsDetail>(
    `/api/v1/admin/news/${encodeURIComponent(id)}`,
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Haber bulunamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  const { id } = await ctx.params;
  let payload: NewsRequest;
  try {
    payload = (await req.json()) as NewsRequest;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await authorizedBackendJson<NewsDetail>(
    `/api/v1/admin/news/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Haber güncellenemedi." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  const { id } = await ctx.params;
  // Backend DELETE 204 döner; body yok. authorizedBackendJson bunu ok=true ile
  // temsil eder (body null olur).
  const r = await authorizedBackendJson(
    `/api/v1/admin/news/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok) {
    // 403 → yalnız ADMIN silebilir.
    return NextResponse.json(
      r.body ?? { message: "Haber silinemedi." },
      { status: r.status },
    );
  }
  return NextResponse.json({ ok: true });
}
