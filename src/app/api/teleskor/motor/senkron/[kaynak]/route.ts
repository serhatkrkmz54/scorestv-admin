import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * Bir kaynağı ELLE çalıştırır.
 *
 * <p>Zamanlanmış turla aynı kirayı kullanıyor — aynı anda iki çalıştırma
 * olmuyor. Yine de sağlayıcıya istek attırıyor, yani kotayı ilgilendiriyor;
 * panel bu yüzden onay istiyor.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ kaynak: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const { kaynak } = await ctx.params;
  const r = await teleskorJson(
    `/api/v1/admin/engine/motor/senkron/calistir/${encodeURIComponent(kaynak)}`,
    { method: "POST" },
  );
  if (r.ok) return NextResponse.json(r.body ?? { ok: true });
  return teleskorResponse(r, "Kaynak çalıştırılamadı.");
}
