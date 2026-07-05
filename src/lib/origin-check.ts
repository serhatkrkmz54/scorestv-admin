import { type NextRequest, NextResponse } from "next/server";

/**
 * BFF mutasyon (POST/PUT/DELETE) rotalarında basit CSRF savunması: isteğin
 * Origin başlığının kendi host'umuzla eşleştiğini doğrular. Public web'deki
 * aynı desenin sadeleştirilmiş hâli. Uyuşmazlıkta 403 döner; null dönerse
 * çağıran işleme devam edebilir.
 */
export function checkSameOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  // Origin yoksa (ör. server-to-server, bazı native istemciler) engelleme.
  if (!origin) return null;
  const host = req.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    if (host && originHost === host) return null;
  } catch {
    // bozuk origin → reddet
  }
  return NextResponse.json({ message: "Geçersiz kaynak." }, { status: 403 });
}
