import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { TestNotificationRequest, TestNotificationResult } from "@/lib/types";

/**
 * Test push: yalnızca verilen e-postanın cihazlarına gönderir (senkron).
 * Backend: /api/v1/admin/notifications/test (EDITOR/ADMIN). Token forward
 * edilir, 401'de bir kez refresh+retry yapılır.
 */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  let payload: TestNotificationRequest;
  try {
    payload = (await req.json()) as TestNotificationRequest;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await authorizedBackendJson<TestNotificationResult>(
    "/api/v1/admin/notifications/test",
    { method: "POST", body: JSON.stringify(payload) },
  );

  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Test bildirimi gönderilemedi." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
