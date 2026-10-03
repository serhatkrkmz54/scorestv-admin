import { NextResponse, type NextRequest } from "next/server";
import { robotsIzni, siteAdresi, WEB, webGetir, yolaCevir } from "@/lib/site-web";
import { teleskorSiteHaritasi } from "@/lib/teleskor-guard";
import type { SiteHaritasiAdresDenetimi } from "@/lib/types";

const EN_COK_YONLENDIRME = 6;
const EN_COK_GOVDE = 3_000_000;

function varlikCoz(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** Bir etiketin öznitelikleri (sıra fark etmez, küçük harfe çevrilmiş adlarla). */
function oznitelikler(etiket: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (let m = re.exec(etiket); m; m = re.exec(etiket)) {
    out[m[1].toLowerCase()] = varlikCoz(m[3] ?? m[4] ?? m[5] ?? "");
  }
  return out;
}

function etiketlerAl(html: string, ad: string): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const re = new RegExp(`<${ad}\\b[^>]*>`, "gi");
  for (let m = re.exec(html); m; m = re.exec(html)) out.push(oznitelikler(m[0]));
  return out;
}

function metinYap(html: string): string {
  return varlikCoz(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** JSON-LD içindeki bütün @type değerleri (@graph ve iç içe nesneler dâhil). */
function turleriTopla(d: unknown, out: Set<string>) {
  if (Array.isArray(d)) d.forEach((x) => turleriTopla(x, out));
  else if (d && typeof d === "object") {
    const o = d as Record<string, unknown>;
    const t = o["@type"];
    if (typeof t === "string") out.add(t);
    else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && out.add(x));
    for (const [k, v] of Object.entries(o)) if (k !== "@type" && typeof v === "object") turleriTopla(v, out);
  }
}

/**
 * ADRES DENETİMİ — bir sayfayı arama motorunun göreceği gibi okur: durum
 * kodu, yönlendirme zinciri, başlık, açıklama, canonical, robots (meta +
 * başlık + robots.txt), H1, Open Graph, yapısal veri türleri, hreflang.
 * Yalnız bu sitenin adresleri (`site-web.ts`).
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorSiteHaritasi();
  if ("error" in izin) return izin.error;
  const ham = req.nextUrl.searchParams.get("adres") ?? "";
  const ilkYol = yolaCevir(ham);
  if (!ilkYol) {
    return NextResponse.json(
      { message: "Yalnız sitenin kendi adresleri denetlenebilir (www.teleskor.com.tr ya da / ile başlayan yol)." },
      { status: 400 },
    );
  }

  const zincir: SiteHaritasiAdresDenetimi["zincir"] = [];
  let yol = ilkYol;
  let son: Response | null = null;
  let sure = 0;
  try {
    for (let i = 0; i <= EN_COK_YONLENDIRME; i++) {
      const t0 = Date.now();
      const y = await webGetir(yol, { yonlendirme: "manual" });
      sure = Date.now() - t0;
      const konum = y.headers.get("location");
      zincir.push({ adres: siteAdresi(WEB + yol), durum: y.status, konum: konum ? siteAdresi(new URL(konum, WEB + yol).toString()) : null });
      if (y.status >= 300 && y.status < 400 && konum) {
        const hedef = new URL(konum, WEB + yol);
        const ayniSite = hedef.origin === new URL(WEB).origin || /^(www\.)?teleskor\.com\.tr$/i.test(hedef.hostname);
        if (!ayniSite) {
          son = y;
          break;
        }
        yol = hedef.pathname + hedef.search;
        continue;
      }
      son = y;
      break;
    }
  } catch {
    return NextResponse.json({ message: "Siteye ulaşılamadı; biraz sonra yeniden deneyin." }, { status: 502 });
  }
  if (!son) {
    return NextResponse.json({ message: `${EN_COK_YONLENDIRME} yönlendirmeden sonra durdu (döngü olabilir).` }, { status: 422 });
  }

  const html = son.status < 300 ? (await son.text()).slice(0, EN_COK_GOVDE) : "";
  const metalar = etiketlerAl(html, "meta");
  const meta = (anahtar: string, deger: string) =>
    metalar.find((m) => (m[anahtar] ?? "").toLowerCase() === deger)?.content ?? null;
  const linkler = etiketlerAl(html, "link");
  const baslikM = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const h1: string[] = [];
  const h1Re = /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi;
  for (let m = h1Re.exec(html); m; m = h1Re.exec(html)) h1.push(metinYap(m[1]));
  const turler = new Set<string>();
  const ldRe = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (let m = ldRe.exec(html); m; m = ldRe.exec(html)) {
    try {
      turleriTopla(JSON.parse(m[1]), turler);
    } catch {
      turler.add("(okunamayan yapısal veri)");
    }
  }

  let robotsTxt: SiteHaritasiAdresDenetimi["robotsTxt"] = { izinli: true, kural: null };
  try {
    const r = await webGetir("/robots.txt");
    if (r.ok) robotsTxt = robotsIzni(await r.text(), yol);
  } catch {
    robotsTxt = { izinli: true, kural: "robots.txt okunamadı" };
  }

  const canonical = linkler.find((l) => (l.rel ?? "").toLowerCase().split(/\s+/).includes("canonical"))?.href ?? null;
  const yanit: SiteHaritasiAdresDenetimi = {
    adres: siteAdresi(WEB + ilkYol),
    yol,
    zincir,
    durum: son.status,
    sure,
    boyut: html.length,
    icerikTuru: son.headers.get("content-type"),
    xRobotsTag: son.headers.get("x-robots-tag"),
    baslik: baslikM ? metinYap(baslikM[1]) : null,
    aciklama: meta("name", "description"),
    canonical: canonical ? siteAdresi(new URL(canonical, WEB + yol).toString()) : null,
    metaRobots: meta("name", "robots"),
    dil: /<html\b[^>]*\blang=["']([^"']+)["']/i.exec(html)?.[1] ?? null,
    h1,
    ogBaslik: meta("property", "og:title"),
    ogAciklama: meta("property", "og:description"),
    ogGorsel: meta("property", "og:image"),
    yapisalVeri: [...turler],
    hreflang: linkler
      .filter((l) => (l.rel ?? "").toLowerCase() === "alternate" && l.hreflang)
      .map((l) => ({ dil: l.hreflang, adres: l.href ?? "" })),
    robotsTxt,
  };
  return NextResponse.json(yanit);
}
