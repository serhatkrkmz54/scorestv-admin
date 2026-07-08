import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type {
  BroadcastListItem,
  BroadcastRequest,
  BroadcastResult,
} from "@/lib/types";

/**
 * Genel bildirim geçmişi (GET) + gönder (POST).
 * Backend: /api/v1/admin/notifications/broadcast (EDITOR/ADMIN). Token forward
 * edilir, 401'de bir kez refresh+retry yapılır.
 */
export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get("limit");
  const qs = limit ? `?limit=${encodeURIComponent(limit)}` : "";
  const r = await authorizedBackendJson<BroadcastListItem[]>(
    `/api/v1/admin/notifications/broadcast${qs}`,
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Geçmiş alınamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}

export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  let payload: BroadcastRequest;
  try {
    payload = (await req.json()) as BroadcastRequest;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await authorizedBackendJson<BroadcastResult>(
    "/api/v1/admin/notifications/broadcast",
    { method: "POST", body: JSON.stringify(payload) },
  );

  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Bildirim gönderilemedi." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
