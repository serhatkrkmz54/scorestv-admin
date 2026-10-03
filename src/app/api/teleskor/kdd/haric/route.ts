import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** Havuz dışındaki oyuncular. */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const r = await teleskorJson("/api/v1/admin/kim-daha-degerli/haric");
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Liste alınamadı.");
}

/** Oyuncuyu havuz dışına alır (yeni sorularda çıkmaz). */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  let payload: { playerId?: number; notu?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  if (typeof payload.playerId !== "number") {
    return NextResponse.json({ message: "Oyuncu seçilmedi." }, { status: 400 });
  }
  const r = await teleskorJson("/api/v1/admin/kim-daha-degerli/haric", {
    method: "POST",
    body: JSON.stringify({ playerId: payload.playerId, notu: (payload.notu ?? "").slice(0, 300) }),
  });
  return teleskorResponse(r, "Havuz dışına alınamadı.");
}
