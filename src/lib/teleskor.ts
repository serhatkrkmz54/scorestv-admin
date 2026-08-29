import "server-only";

/**
 * TELESKOR KÖPRÜSÜ — bu panel iki ürüne birden hizmet ediyor.
 *
 * ScoresTV backend'i {@link ./backend.ts} üzerinden konuşuluyor ve oradaki
 * kimlik panelin kendi oturumu. Teleskor AYRI bir servis: ayrı sunucu, ayrı
 * veritabanı, ayrı kullanıcı tablosu. Paneldeki editörün Teleskor'da bir
 * hesabı YOK ve olmamalı — Teleskor'un üyeleri son kullanıcılar.
 *
 * <h3>Çözüm: sunucu tarafında hizmet hesabı</h3>
 * Panelin sunucusu Teleskor'da tek bir ADMIN hesabıyla oturum açıyor ve
 * bütün yönetim isteklerini onunla atıyor. Kimlik bilgileri `.env`'de,
 * tarayıcıya HİÇ gitmiyor. Erişimi panelin kendi ADMIN kontrolü koruyor
 * (bkz. aşağıdaki uyarı).
 *
 * <h3>KİM YAPTI SORUSU — ve nasıl cevaplanıyor</h3>
 * Teleskor'un denetim zinciri bütün bu işlemleri TEK hesap üzerinde
 * görecek: "market ürününü kim ekledi" sorusunun cevabı hep aynı çıkardı.
 * Bu yüzden panel, işlemi yapan editörün kimliğini isteğin İÇİNDE
 * taşıyor ({@link teleskorAktor}) ve Teleskor tarafında denetim ayrıntısına
 * yazılıyor. İzlenebilirlik kaybolmuyor, yalnız yeri değişiyor.
 *
 * <h3>UYARI — panel tarafında rol kontrolü ŞART</h3>
 * Hizmet hesabı her zaman ADMIN olduğu için Teleskor artık "bu isteği kim
 * attı" diye soramıyor. Yetki kontrolünün TAMAMI bu panelde: her rota
 * {@code resolveUserAllowRefresh()} ile kullanıcıyı çözüp ADMIN olup
 * olmadığına bakmak ZORUNDA. Unutulursa EDITOR rolündeki bir editör
 * Teleskor'un marketini yönetebilir ve hiçbir yerde hata patlamaz.
 */

const BASE = process.env.TELESKOR_BACKEND_URL ?? "";
const USER = process.env.TELESKOR_ADMIN_USER ?? "";
const PASS = process.env.TELESKOR_ADMIN_PASSWORD ?? "";

export interface TeleskorResult<T = unknown> {
  ok: boolean;
  status: number;
  body: T | null;
  /** Köprü kurulu değil (env eksik) — 503'ten ayırt edilebilmesi için. */
  notConfigured?: boolean;
}

/** Köprü kurulu mu? Sayfalar bunu kullanıp anlaşılır bir uyarı gösteriyor. */
export function teleskorConfigured(): boolean {
  return !!BASE && !!USER && !!PASS;
}

/**
 * Erişim token'ı BELLEKTE tutuluyor.
 *
 * Teleskor'un erişim token'ı 15 dakikalık. Her istekte yeniden giriş yapmak
 * hem gereksiz hem zararlı olurdu: her giriş Teleskor'da yeni bir cihaz
 * oturumu açıyor ve "yeni cihazdan giriş" uyarısı üretebiliyor. Süresi
 * dolduğunda ya da 401 geldiğinde bir kez yenileniyor.
 *
 * Bellekte olması kabul edilebilir: panel yeniden başlarsa ilk istekte
 * tekrar giriş yapılıyor. Kalıcı saklamanın getirisi yok, riski var.
 */
let token: string | null = null;
let tokenExpiresAt = 0;

/** Eşzamanlı isteklerin AYNI girişi beklemesi için — yoksa 10 istek 10 giriş açardı. */
let loginInFlight: Promise<string | null> | null = null;

async function login(): Promise<string | null> {
  if (loginInFlight) return loginInFlight;
  loginInFlight = (async () => {
    try {
      const res = await fetch(BASE + "/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: USER, password: PASS }),
        cache: "no-store",
      });
      if (!res.ok) return null;
      const body = (await res.json()) as {
        accessToken?: string;
        expiresIn?: number;
      };
      if (!body.accessToken) return null;
      token = body.accessToken;
      // 60 sn emniyet payı: tam sınırda giden bir istek 401 yemesin.
      const ttl = (body.expiresIn ?? 900) - 60;
      tokenExpiresAt = Date.now() + Math.max(ttl, 60) * 1000;
      return token;
    } catch {
      return null;
    } finally {
      loginInFlight = null;
    }
  })();
  return loginInFlight;
}

async function currentToken(): Promise<string | null> {
  if (token && Date.now() < tokenExpiresAt) return token;
  return login();
}

/**
 * Teleskor backend'ine kimlikli JSON isteği. 401'de BİR KEZ yeniden giriş
 * yapıp tekrar dener (token süresi beklenenden erken dolmuş olabilir:
 * Teleskor tarafında şifre değişimi ya da "tüm oturumları kapat").
 */
export async function teleskorJson<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<TeleskorResult<T>> {
  if (!teleskorConfigured()) {
    return { ok: false, status: 503, body: null, notConfigured: true };
  }

  const gonder = async (t: string) => {
    try {
      return await fetch(BASE + path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
          Authorization: `Bearer ${t}`,
        },
        cache: "no-store",
      });
    } catch {
      return null;
    }
  };

  let t = await currentToken();
  if (!t) return { ok: false, status: 502, body: null };

  let res = await gonder(t);
  if (res && res.status === 401) {
    token = null;
    t = await login();
    if (!t) return { ok: false, status: 502, body: null };
    res = await gonder(t);
  }
  if (!res) return { ok: false, status: 503, body: null };

  const text = await res.text();
  let body: T | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as T;
    } catch {
      body = text as unknown as T;
    }
  }
  return { ok: res.ok, status: res.status, body };
}

/**
 * İşlemi yapan editörün kimliği — Teleskor'un denetim kaydına yazılsın diye
 * not alanlarına ekleniyor.
 *
 * <p>Metin kısa tutuluyor: Teleskor'un yönetici notu alanı KULLANICIYA
 * gösteriliyor (kargo takip numarası, iptal gerekçesi). Panel kullanıcısının
 * e-postası oraya sızmamalı — yalnız görünen ad kullanılıyor.
 */
export function teleskorAktor(displayName?: string | null): string {
  const ad = (displayName ?? "").trim();
  return ad ? ad : "panel";
}
