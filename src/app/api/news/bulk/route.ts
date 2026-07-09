import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { BulkNewsRequest, BulkResult } from "@/lib/types";

/**
 * Toplu haber işlemi (POST).
 * Backend: POST /api/v1/admin/news/bulk — EDITOR/ADMIN; DELETE eylemi backend'de
 * AYRICA ADMIN'e gate edilir. Token forward + same-origin kontrolü.
 */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  let payload: BulkNewsRequest;
  try {
    payload = (await req.json()) as BulkNewsRequest;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await authorizedBackendJson<BulkResult>("/api/v1/admin/news/bulk", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Toplu işlem başarısız." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
