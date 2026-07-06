import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { TranslateNewsResult } from "@/lib/types";

/**
 * POST /api/news/translate — başlık/özet/gövdeyi kaynak→hedef dile çevirir
 * (EDITOR/ADMIN). Backend: POST /api/v1/admin/news/translate (DeepL).
 * Statik "translate" segmenti, dinamik [id] rotasından önce eşleşir.
 */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  const r = await authorizedBackendJson<TranslateNewsResult>(
    "/api/v1/admin/news/translate",
    { method: "POST", body: JSON.stringify(payload) },
  );

  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Çeviri yapılamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
