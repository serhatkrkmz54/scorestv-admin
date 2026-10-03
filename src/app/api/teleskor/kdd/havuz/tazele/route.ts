import { type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/** Havuzu motordan yeniden ister. */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const r = await teleskorJson("/api/v1/admin/kim-daha-degerli/havuz/tazele", { method: "POST", body: "{}" });
  return teleskorResponse(r, "Havuz tazelenemedi.");
}
