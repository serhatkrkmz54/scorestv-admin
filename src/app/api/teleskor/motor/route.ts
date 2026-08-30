import { NextResponse } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin } from "@/lib/teleskor-guard";

/**
 * MOTOR ÖZETİ — durum + senkron sağlığı + plan + kota, TEK istekte.
 *
 * <p>Dördü PARALEL çekiliyor ve biri düşerse diğerleri gösteriliyor:
 * "motor ne durumda" sayfasının tek rapor yüzünden boş kalması ters bir
 * sonuç olurdu (sağlık ekranındaki kararın aynısı).
 */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const [durum, senkron, plan, kota] = await Promise.all([
    teleskorJson("/api/v1/admin/engine/motor/durum"),
    teleskorJson("/api/v1/admin/engine/motor/senkron"),
    teleskorJson("/api/v1/admin/engine/motor/senkron/plan"),
    teleskorJson("/api/v1/admin/engine/motor/senkron/kota"),
  ]);

  return NextResponse.json({
    durum: durum.ok ? durum.body : null,
    senkron: senkron.ok ? senkron.body : null,
    plan: plan.ok ? plan.body : null,
    kota: kota.ok ? kota.body : null,
  });
}
