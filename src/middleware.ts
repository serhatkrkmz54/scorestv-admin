import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/cookie-names";

/**
 * Kaba erişim kapısı (Edge). Oturum çerezi (access VEYA refresh) yoksa panel
 * rotalarını /login'e yönlendirir. ROL (EDITOR/ADMIN) doğrulaması burada
 * yapılmaz — Edge'de backend'e istek atmıyoruz; asıl rol kontrolü sunucu
 * layout'unda (app/(panel)/layout.tsx) /api/v1/auth/me ile yapılır.
 *
 * Matcher: /login, /api/*, statik dosyalar ve _next hariç her şey.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const hasSession =
    req.cookies.has(ACCESS_COOKIE) || req.cookies.has(REFRESH_COOKIE);

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Panel rotalarını koru; login, API (kendi auth'unu yönetir), statikler hariç.
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};
