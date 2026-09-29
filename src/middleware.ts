import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, GATE_COOKIE } from "@/lib/cookie-names";
import { tekUcusYenile, type YenilemeSonucu } from "@/lib/yenileme-ucusu";

// Teleskor backend adresi (backend.ts ile aynı değişken ve aynı sıra).
const BACKEND =
  process.env.TELESKOR_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8080";
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 gün (Teleskor REFRESH_TOKEN_TTL)

// ---- Erişim kapısı (paylaşımlı PIN/anahtar) ----
// PANEL_GATE_KEY: editörlerin gireceği anahtar (yalnız sunucuda doğrulanır).
// PANEL_GATE_TOKEN: kapıyı geçince çereze yazılan opak değer (uzun rastgele).
// İkisi de doluysa kapı aktif; boşsa TAMAMEN devre dışı (geriye uyumlu).
const GATE_TOKEN = process.env.PANEL_GATE_TOKEN ?? "";
const GATE_ENABLED = (process.env.PANEL_GATE_KEY ?? "").length > 0 && GATE_TOKEN.length > 0;

/**
 * Erişim kapısı + OTURUM TAZELEME (Edge middleware).
 *
 * Akış:
 *  1. Ne access ne refresh çerezi yoksa → /login.
 *  2. Access çerezi VAR ve süresi dolmamışsa → geç (hızlı yol; backend'e gitmez).
 *  3. Access yok/süresi dolmuş ama refresh varsa → backend `/auth/refresh` ile
 *     yenile; yeni çerezleri HEM tarayıcıya (response) HEM bu isteğin render'ına
 *     (request header) yaz. Rotasyon böylece KALICI olur.
 *  4. Refresh 401/403 dönerse → çerez temizle + /login. Backend geçici
 *     erişilemezse oturumu DÜŞÜRMEYİZ (olduğu gibi devam, render kendi dener).
 *
 * NEDEN BURADA: eskiden tazeleme layout render'ında (resolveUser) yapılıyordu.
 * Next.js render sırasında cookie YAZAMADIĞI için yeni refresh token kayboluyor,
 * eski token "yeniden kullanıldı" sanılıp backend TÜM oturumları kapatıyordu
 * ("Oturum gerekli."). Middleware çerez yazabildiği için doğru yer burası.
 */
function isJwtExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof json.exp !== "number") return true;
    // 30 sn tampon — sınırda proaktif yenile.
    return Date.now() / 1000 >= json.exp - 30;
  } catch {
    return true;
  }
}

function loginRedirect(req: NextRequest, clear: boolean): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  const res = NextResponse.redirect(url);
  if (clear) {
    res.cookies.delete(ACCESS_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
  }
  return res;
}

/**
 * Yenileme çereziyle oturumu tazeler; yeni çerezleri HEM tarayıcıya
 * (yanıt) HEM bu isteğin işleyicisine (istek başlığı) yazar.
 *
 * @returns yanıt, ya da "gecersiz" (Teleskor 401/403: token gerçekten öldü).
 *          Ağ/sunucu arızasında oturum düşürülmez, istek olduğu gibi geçer.
 */
async function tazele(req: NextRequest, refresh: string): Promise<NextResponse | "gecersiz"> {
  try {
    // TEK UÇUŞ: aynı anda gelen istekler aynı token'la ayrı ayrı yenilerse
    // Teleskor ikincisini hırsızlık sayıyordu (gerekçe yenileme-ucusu.ts).
    const sonuc = await tekUcusYenile(refresh, async (): Promise<YenilemeSonucu> => {
      const r = await fetch(BACKEND + "/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
        cache: "no-store",
      });
      if (!r.ok) return { ok: false, status: r.status };
      const govde = (await r.json()) as {
        accessToken: string;
        refreshToken: string;
        expiresInSeconds?: number;
      };
      return { ok: true, ...govde };
    });
    if (sonuc.ok) {
      // Bu isteğin işleyicisi taze access token'ı görsün (request header).
      req.cookies.set(ACCESS_COOKIE, sonuc.accessToken);
      req.cookies.set(REFRESH_COOKIE, sonuc.refreshToken);
      const res = NextResponse.next({ request: { headers: req.headers } });
      const secure = process.env.NODE_ENV === "production";
      const common = {
        httpOnly: true,
        sameSite: "lax" as const,
        secure,
        path: "/",
      };
      // Tarayıcıya kalıcı yaz.
      res.cookies.set(ACCESS_COOKIE, sonuc.accessToken, {
        ...common,
        maxAge: Math.max(sonuc.expiresInSeconds ?? 900, 60),
      });
      res.cookies.set(REFRESH_COOKIE, sonuc.refreshToken, {
        ...common,
        maxAge: REFRESH_MAX_AGE,
      });
      return res;
    }
    if (sonuc.status === 401 || sonuc.status === 403) return "gecersiz";
    // 5xx / ağ hatası → geçici kabul et, oturumu düşürme
    return NextResponse.next();
  } catch {
    return NextResponse.next();
  }
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname;

  // BFF (API) İSTEKLERİ: YALNIZ oturum tazeleme (29 Eylül). Eskiden API
  // yolları middleware'e hiç girmiyordu ve her route handler kendi
  // yenilemesini yapıyordu; sayfa açılırken middleware ile paralel API
  // çağrıları AYNI çerezle ayrı ayrı yeniliyor, Teleskor ikincisini
  // hırsızlık sayıp bütün oturumları kapatıyordu (yerelde ölçüldü: tek
  // sayfa açılışı 5 "hırsızlık"). Yenileme artık TEK noktada. Kapı ve
  // login yönlendirmesi API'de yok: oturumsuz istek işleyicide 401 alır.
  if (path.startsWith("/api/")) {
    if (path.startsWith("/api/auth/")) return NextResponse.next();
    const apiErisim = req.cookies.get(ACCESS_COOKIE)?.value;
    const apiYenileme = req.cookies.get(REFRESH_COOKIE)?.value;
    if (!apiYenileme || (apiErisim && !isJwtExpired(apiErisim))) {
      return NextResponse.next();
    }
    const sonuc = await tazele(req, apiYenileme);
    return sonuc === "gecersiz" ? NextResponse.next() : sonuc;
  }

  // 0. ERİŞİM KAPISI — /gate hariç TÜM sayfaları (login dahil) sarar. Kapıyı
  //    geçmeyen kullanıcı paneli/login'i göremez, anahtar ekranına atılır.
  if (GATE_ENABLED) {
    const gatePassed = req.cookies.get(GATE_COOKIE)?.value === GATE_TOKEN;
    if (path === "/gate") {
      // Zaten geçtiyse kapı ekranında oyalanma → panele gönder.
      if (gatePassed) {
        const url = req.nextUrl.clone();
        url.pathname = "/";
        url.search = "";
        return NextResponse.redirect(url);
      }
      return NextResponse.next(); // anahtar formunu göster
    }
    if (!gatePassed) {
      const url = req.nextUrl.clone();
      url.pathname = "/gate";
      url.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  } else if (path === "/gate") {
    // Kapı kapalıysa boş /gate sayfası kalmasın → login'e yönlendir.
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Login sayfası: kapı geçildi (ya da kapı kapalı) → ayrıca oturum arama.
  if (path === "/login") {
    return NextResponse.next();
  }

  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  // 1. Oturum yok
  if (!access && !refresh) {
    return loginRedirect(req, false);
  }

  // 2. Access hâlâ geçerli → dokunma
  if (access && !isJwtExpired(access)) {
    return NextResponse.next();
  }

  // 3. Refresh ile yenile (kalıcı çerez yazımı burada güvenli)
  if (refresh) {
    const sonuc = await tazele(req, refresh);
    if (sonuc === "gecersiz") return loginRedirect(req, true);
    return sonuc;
  }

  // Access süresi dolmuş, refresh yok → login
  return loginRedirect(req, true);
}

export const config = {
  // Middleware /login VE /gate dahil tüm sayfalarda ve BFF API'lerinde
  // çalışır (API'de yalnız oturum tazeleme, bkz. middleware başı). Hariç: _next
  // statikler ve public dosyaları. ÖNEMLİ: `.*\..*` uzantılı yolları
  // (/images/*.jpg, *.png, robots.txt vb.) dışlar — aksi halde login arka planı
  // (login-bg.jpg) gibi statik istekler kapıya takılıp redirect oluyordu.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
