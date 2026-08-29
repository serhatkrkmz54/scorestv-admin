import { NextResponse } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin } from "@/lib/teleskor-guard";
import type { MotorDurumu, MotorKullanimi, DbYukRaporu } from "@/lib/types";

/**
 * SİSTEM SAĞLIĞI — üç raporu TEK istekte topluyor.
 *
 * <p>Ekran üçünü birlikte gösteriyor; ayrı ayrı çekilseydi tarayıcı üç
 * gidiş-dönüş yapardı ve biri yavaşladığında sayfa parça parça dolardı.
 *
 * <p>Üçü PARALEL çekiliyor ve <b>biri düşerse diğerleri gösteriliyor</b>:
 * "sistem sağlıklı mı" sayfasının, bir raporun düşmesi yüzünden tümden
 * boş kalması ters bir sonuç olurdu.
 */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const [durum, kullanim, dbYuk] = await Promise.all([
    teleskorJson<MotorDurumu>("/api/v1/admin/engine/status"),
    teleskorJson<MotorKullanimi>("/api/v1/admin/engine/usage"),
    teleskorJson<DbYukRaporu>("/api/v1/admin/db-usage"),
  ]);

  return NextResponse.json({
    motorDurumu: durum.ok ? durum.body : null,
    motorKullanimi: kullanim.ok ? kullanim.body : null,
    dbYuk: dbYuk.ok ? dbYuk.body : null,
  });
}
