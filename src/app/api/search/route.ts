// BFF proxy: GET /api/search?q=...&types=... → backend /api/v1/search
// Entity linking (takım/lig/oyuncu/ülke) autocomplete'i için. Auth ilet
// (oturum panelde zaten var); backend public olsa da tutarlılık için token
// forward ederiz. Debounce frontend'te.
import { NextResponse, type NextRequest } from "next/server";
import { backendJson } from "@/lib/backend";
import { getForwardAccessToken } from "@/lib/auth-server";
import type { SearchResponse } from "@/lib/types";

const EMPTY: SearchResponse = {
  query: "",
  tookMs: 0,
  teams: [],
  leagues: [],
  players: [],
  fixtures: [],
  countries: [],
  coaches: [],
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json(EMPTY);
  }
  const types = req.nextUrl.searchParams.get("types") ?? "";

  const qs = new URLSearchParams();
  qs.set("q", q);
  if (types) qs.set("types", types);

  const token = await getForwardAccessToken();
  const r = await backendJson<SearchResponse>(
    `/api/v1/search?${qs.toString()}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );
  if (!r.ok || !r.body) {
    // Backend offline/hata — boş payload; dropdown sessizce kapanır.
    return NextResponse.json(EMPTY, { status: r.status === 503 ? 200 : r.status });
  }
  return NextResponse.json(r.body);
}
