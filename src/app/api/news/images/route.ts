import { NextResponse, type NextRequest } from "next/server";
import { backendFetch } from "@/lib/backend";
import { getForwardAccessToken } from "@/lib/auth-server";
import { checkSameOrigin } from "@/lib/origin-check";
import type { ImageUploadResult } from "@/lib/types";

/**
 * Görsel yükleme (multipart) → backend POST /api/v1/admin/news/images.
 * İstemci FormData(file) gönderir; biz aynı dosyayı Bearer token ile backend'e
 * iletir, { key, url } döndürürüz. Content-Type başlığını ELLE VERMEYİZ —
 * fetch, multipart boundary'yi kendisi ekler.
 */
export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  const token = await getForwardAccessToken();
  if (!token) {
    return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ message: "Geçersiz dosya isteği." }, { status: 400 });
  }
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ message: "Dosya bulunamadı." }, { status: 400 });
  }

  // Backend'e ileteceğimiz temiz bir FormData oluştur.
  const forward = new FormData();
  forward.append("file", file);

  const res = await backendFetch("/api/v1/admin/news/images", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: forward,
  });

  if (!res) {
    return NextResponse.json({ message: "Sunucuya ulaşılamıyor." }, { status: 503 });
  }
  const text = await res.text();
  let body: ImageUploadResult | { message?: string } | null = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }
  if (!res.ok) {
    return NextResponse.json(
      body ?? { message: "Görsel yüklenemedi." },
      { status: res.status },
    );
  }
  return NextResponse.json(body);
}
