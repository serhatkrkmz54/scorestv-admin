import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { checkSameOrigin } from "@/lib/origin-check";
import { GATE_COOKIE } from "@/lib/cookie-names";

/**
 * Erişim kapısı doğrulaması. Girilen anahtar YALNIZ sunucuda PANEL_GATE_KEY ile
 * timing-safe karşılaştırılır (tarayıcıya asla sızmaz). Doğruysa opak
 * PANEL_GATE_TOKEN değeri httpOnly çereze yazılır; middleware bunu kontrol eder.
 * Basit IP-başına hız sınırı brute-force'u yavaşlatır (tek konteyner, en iyi çaba).
 */
const GATE_KEY = process.env.PANEL_GATE_KEY ?? "";
const GATE_TOKEN = process.env.PANEL_GATE_TOKEN ?? "";
const GATE_MAX_AGE = 60 * 60 * 24 * 30; // 30 gün

const WINDOW_MS = 10 * 60 * 1000; // 10 dk
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function tooMany(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 0, resetAt: now + WINDOW_MS });
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

function recordFail(ip: string): void {
  const now = Date.now();
  const rec = attempts.get(ip) ?? { count: 0, resetAt: now + WINDOW_MS };
  rec.count += 1;
  attempts.set(ip, rec);
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const bad = checkSameOrigin(req);
  if (bad) return bad;

  if (!GATE_KEY || !GATE_TOKEN) {
    return NextResponse.json({ message: "Kapı yapılandırılmamış." }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (tooMany(ip)) {
    return NextResponse.json(
      { message: "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin." },
      { status: 429 },
    );
  }

  let key = "";
  try {
    const body = (await req.json()) as { key?: unknown };
    key = typeof body.key === "string" ? body.key : "";
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  if (!safeEqual(key, GATE_KEY)) {
    recordFail(ip);
    // Küçük gecikme — otomatik denemeleri yavaşlatır.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ message: "Anahtar hatalı." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, GATE_TOKEN, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GATE_MAX_AGE,
  });
  return res;
}
