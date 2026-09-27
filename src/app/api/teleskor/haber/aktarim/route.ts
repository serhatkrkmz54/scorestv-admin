import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorDosya, teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * SCORESTV HABERLERİNİN AKTARIMI — dışa aktarma dosyası (tgz) Teleskor'a
 * gider, iş orada arka planda çalışır; durum ve rapor GET ile yoklanır.
 * `dene=true`: yazma ve görsel indirme yok, yalnız rapor.
 */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const r = await teleskorJson(`/api/v1/admin/haber/aktarim`);
  return teleskorResponse(r, "Aktarım durumu alınamadı.");
}

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
  if (dosya.size > 50 * 1024 * 1024) {
    return NextResponse.json({ message: "Dosya en fazla 50 MB olabilir." }, { status: 413 });
  }
  const dene = req.nextUrl.searchParams.get("dene") !== "false";
  const ileri = new FormData();
  ileri.append("dosya", dosya, dosya.name || "haber-aktarim.tgz");
  const r = await teleskorDosya(`/api/v1/admin/haber/aktarim?dene=${dene}`, ileri);
  return teleskorResponse(r, "Aktarım başlatılamadı.", 202);
}
