import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type {
  GameCompetitionItem,
  CreateCompetitionRequest,
} from "@/lib/types";

/**
 * Oyun yarışmaları (Scores Coin) — ADMIN.
 * Backend:
 *   GET  /api/v1/admin/game/competitions
 *   POST /api/v1/admin/game/competitions  (CreateCompetitionRequest)
 */
export async function GET() {
  const r = await authorizedBackendJson<GameCompetitionItem[]>(
    "/api/v1/admin/game/competitions",
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Yarışmalar alınamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}

export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  let payload: CreateCompetitionRequest;
  try {
    payload = (await req.json()) as CreateCompetitionRequest;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await authorizedBackendJson<GameCompetitionItem>(
    "/api/v1/admin/game/competitions",
    { method: "POST", body: JSON.stringify(payload) },
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Yarışma oluşturulamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body, { status: 201 });
}
