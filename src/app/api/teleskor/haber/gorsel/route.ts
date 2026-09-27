import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorDosya } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * Haber görseli (kapak ya da metin içi) — Teleskor deposuna
 * (cdn.teleskor.com.tr). Teleskor tarafı baytlardan tür denetler, 1080 px'e
 * küçültür ve içerikten anahtar üretir. Yanıt: `{ anahtar, adres }`.
 */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ message: "Dosya okunamadı." }, { status: 400 });
  }
  const dosya = form.get("file");
  if (!(dosya instanceof File) || dosya.size === 0) {
    return NextResponse.json({ message: "Dosya seçilmedi." }, { status: 400 });
  }
  if (dosya.size > 10 * 1024 * 1024) {
    return NextResponse.json({ message: "Görsel en fazla 10 MB olabilir." }, { status: 413 });
  }
  const ileri = new FormData();
  ileri.append("dosya", dosya, dosya.name || "gorsel.jpg");
  const r = await teleskorDosya(`/api/v1/admin/haber/gorsel`, ileri);
  return teleskorResponse(r, "Görsel yüklenemedi.");
}
