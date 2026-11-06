import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** OYUNCU DÜZENLEME — sakatlık sebebi sözlüğünde arama. */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json([]);
  const r = await teleskorJson<unknown>(
    `/api/v1/admin/engine/oyuncu-duzeltme/sakatlik-sebep-ara?q=${encodeURIComponent(q)}&limit=30`,
  );
  return teleskorResponse(r, "Sebep araması yapılamadı.");
}
