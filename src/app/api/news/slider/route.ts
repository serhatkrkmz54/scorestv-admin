import { NextResponse, type NextRequest } from "next/server";
import { authorizedBackendJson } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { NewsListItem, SaveSliderRequest } from "@/lib/types";

/** GET /api/v1/admin/news/slider?lang= — mevcut slider (sıralı). */
export async function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get("lang") || "tr";
  const r = await authorizedBackendJson<NewsListItem[]>(
    `/api/v1/admin/news/slider?lang=${encodeURIComponent(lang)}`,
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Slider alınamadı." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}

/** PUT /api/v1/admin/news/slider — slider üyelik+sırasını kaydet. */
export async function PUT(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  let payload: SaveSliderRequest;
  try {
    payload = (await req.json()) as SaveSliderRequest;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  const r = await authorizedBackendJson<NewsListItem[]>(
    "/api/v1/admin/news/slider",
    { method: "PUT", body: JSON.stringify(payload) },
  );
  if (r.unauthorized) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }
  if (!r.ok || !r.body) {
    return NextResponse.json(
      r.body ?? { message: "Slider kaydedilemedi." },
      { status: r.status },
    );
  }
  return NextResponse.json(r.body);
}
