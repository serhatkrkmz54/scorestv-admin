import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { AppUser, UpdateProfileRequest } from "@/lib/types";

/**
 * Görünen ad / profil güncelleme (Ayarlar → Profil).
 * Backend: PUT /api/v1/auth/me (UpdateProfileRequest) → UserResponse.
 * Tüm roller için; token forward edilir.
 */
export async function PUT(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  let payload: UpdateProfileRequest;
  try {
    payload = (await req.json()) as UpdateProfileRequest;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await authorizedBackendJson<AppUser>("/api/v1/auth/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Profil güncellenemedi." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
