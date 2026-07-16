import { NextResponse } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import type { NotificationDeliverySummary } from "@/lib/types";

/**
 * Gönderim özeti (statü rozetleri). Backend:
 * GET /api/v1/admin/notifications/deliveries/summary (EDITOR/ADMIN).
 */
export async function GET() {
  const r = await authorizedBackendJson<NotificationDeliverySummary>(
    `/api/v1/admin/notifications/deliveries/summary`,
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Özet alınamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
