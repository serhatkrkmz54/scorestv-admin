import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * OYUNCU DÜZENLEME (motor V119-V122) — oyuncu profilinin başarılar,
 * transferler, sakatlık geçmişi, sezon istatistikleri ve genel bakış metni. Tek dosya, çünkü iki yol kalıbı aynı seviyede:
 *
 *   GET    /{oyuncuId}/oduller | transferler | transfer-turleri | sakatliklar | sezonlar | biyografi
 *   POST   /{oyuncuId}/oduller | transferler | sakatliklar | sezonlar | biyografi
 *   DELETE /oduller|transferler|sakatliklar|sezonlar/{duzeltmeId}
 *   DELETE /{oyuncuId}/biyografi  (oyuncunun açık metni; kimlik oyuncunun)
 *
 * Kurallar (gerekçe, gizleme eşleşmesi) motorda; yazan kişi ürün
 * backend'inde oturumdan alınıyor.
 */
const OKUMA = new Set(["oduller", "transferler", "transfer-turleri", "sakatliklar", "sezonlar", "biyografi"]);
const YAZMA = new Set(["oduller", "transferler", "sakatliklar", "sezonlar", "biyografi"]);
const SILME = new Set(["oduller", "transferler", "sakatliklar", "sezonlar"]);
const KOK = "/api/v1/admin/engine/oyuncu-duzeltme";

type Parametre = { params: Promise<{ a: string; b: string }> };

function gecersiz() {
  return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
}

export async function GET(_req: NextRequest, { params }: Parametre) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const { a, b } = await params;
  if (!/^\d+$/.test(a) || !OKUMA.has(b)) return gecersiz();
  const r = await teleskorJson<unknown>(`${KOK}/${a}/${b}`);
  return teleskorResponse(r, "Kayıtlar alınamadı.");
}

export async function POST(req: NextRequest, { params }: Parametre) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const { a, b } = await params;
  if (!/^\d+$/.test(a) || !YAZMA.has(b)) return gecersiz();
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return gecersiz();
  }
  const r = await teleskorJson<unknown>(`${KOK}/${a}/${b}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return teleskorResponse(r, "Kaydedilemedi.");
}

export async function DELETE(req: NextRequest, { params }: Parametre) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const { a, b } = await params;
  const biyografi = /^\d+$/.test(a) && b === "biyografi";
  if (!biyografi && (!SILME.has(a) || !/^\d+$/.test(b))) return gecersiz();
  const r = await teleskorJson<unknown>(`${KOK}/${a}/${b}`, { method: "DELETE" });
  return teleskorResponse(r, "Geri alınamadı.");
}
