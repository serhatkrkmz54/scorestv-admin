import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** Kim Daha Değerli? havuzunda ara (ad, takım, lig); en çok 100 satır. */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  const haric = req.nextUrl.searchParams.get("sadeceHaric") === "true";
  const r = await teleskorJson(
    `/api/v1/admin/kim-daha-degerli/havuz?q=${encodeURIComponent(q)}&sadeceHaric=${haric}`,
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Havuz alınamadı.");
}
