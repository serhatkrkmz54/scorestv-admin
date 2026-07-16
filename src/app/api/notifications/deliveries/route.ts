import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { NotificationDelivery } from "@/lib/types";

/**
 * Maç-olay bildirim gönderimleri (takip). Backend:
 * GET /api/v1/admin/notifications/deliveries?status=&limit= (EDITOR/ADMIN).
 * Token forward edilir, 401'de bir kez refresh+retry yapılır.
 */
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const limit = req.nextUrl.searchParams.get("limit");
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (limit) qs.set("limit", limit);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const r = await authorizedBackendJson<NotificationDelivery[]>(
    `/api/v1/admin/notifications/deliveries${suffix}`,
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Gönderimler alınamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
