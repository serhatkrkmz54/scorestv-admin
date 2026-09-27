import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** Takım / lig / oyuncu araması — motorun kataloğundan (kimlikler motorun). */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const p = req.nextUrl.searchParams;
  const tur = p.get("tur") ?? "";
  const spor = p.get("spor") === "BASKETBALL" ? "BASKETBALL" : "FOOTBALL";
  const q = (p.get("q") ?? "").trim().slice(0, 60);
  if (!/^(TAKIM|LIG|OYUNCU)$/.test(tur)) {
    return NextResponse.json({ message: "Geçersiz tür." }, { status: 400 });
  }
  if (q.length < 2) return NextResponse.json([]);
  const r = await teleskorJson(
    `/api/v1/admin/haber/varlik-ara?tur=${tur}&spor=${spor}&q=${encodeURIComponent(q)}`,
  );
  return teleskorResponse(r, "Arama yapılamadı.");
}
