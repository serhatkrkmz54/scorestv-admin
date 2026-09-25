import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { KadroOyuncuBulgusu } from "@/lib/types";

/** KADRO MASASI — eklenecek oyuncuyu ad ya da kimlikle arar. */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json([]);
  const r = await teleskorJson<KadroOyuncuBulgusu[]>(
    `/api/v1/admin/engine/kadro/oyuncu-ara?q=${encodeURIComponent(q)}`,
  );
  return teleskorResponse(r, "Oyuncu araması yapılamadı.");
}
