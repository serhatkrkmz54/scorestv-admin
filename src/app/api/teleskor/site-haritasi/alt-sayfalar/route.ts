import { NextResponse, type NextRequest } from "next/server";
import { siteAdresi, WEB, webGetir, yolaCevir } from "@/lib/site-web";
import { teleskorSiteHaritasi } from "@/lib/teleskor-guard";
import type { AltSayfaTaramasi } from "@/lib/types";

const EN_COK = 20;
const AYNI_ANDA = 4;

function robotsMeta(html: string): string | null {
  const m = /<meta\b[^>]*name=["']robots["'][^>]*>/i.exec(html);
  if (!m) return null;
  const c = /content=["']([^"']*)["']/i.exec(m[0]);
  return c ? c[1] : null;
}

function baslik(html: string): string | null {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? m[1].replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').trim() : null;
}

/**
 * ALT SAYFA TARAMASI — bir sayfanın kendisini ve sayfadaki bir alt düzey
 * bağlantılarını (sekmeler: /fikstur, /kadro, /tv…) arama motoru gibi okur:
 * durum kodu, dizine ekleme (sayfa içi + başlık), başlık. Verisi olmayan
 * sekmelerin otomatik "noindex" aldığı buradan görülür. Yalnız bu site.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorSiteHaritasi();
  if ("error" in izin) return izin.error;
  const yol = yolaCevir(req.nextUrl.searchParams.get("adres") ?? "");
  if (!yol) {
    return NextResponse.json({ message: "Yalnız sitenin kendi adresleri taranabilir." }, { status: 400 });
  }
  const temel = yol.replace(/[?#].*$/, "").replace(/\/+$/, "") || "/";
  let html: string;
  try {
    const y = await webGetir(temel);
    if (!y.ok) return NextResponse.json({ message: `Sayfa ${y.status} döndü.` }, { status: 422 });
    html = await y.text();
  } catch {
    return NextResponse.json({ message: "Siteye ulaşılamadı." }, { status: 502 });
  }
  const onek = temel === "/" ? "/" : temel + "/";
  const altlar = new Set<string>();
  const re = /href=["']([^"'#?]+)["']/g;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    let h = m[1];
    if (h.startsWith(WEB)) h = h.slice(WEB.length);
    if (/^https?:\/\/(www\.)?teleskor\.com\.tr/i.test(h)) h = h.replace(/^https?:\/\/[^/]+/, "");
    if (!h.startsWith(onek) || h === temel) continue;
    const kalan = h.slice(onek.length);
    if (!kalan || kalan.includes("/") || kalan.includes(".")) continue;
    altlar.add(h);
    if (altlar.size >= EN_COK) break;
  }
  const yollar = [temel, ...[...altlar].sort()];
  const satirlar: AltSayfaTaramasi["satirlar"] = new Array(yollar.length);
  let sira = 0;
  async function isci() {
    while (sira < yollar.length) {
      const i = sira++;
      const y = yollar[i];
      try {
        const r = await webGetir(y, { yonlendirme: "manual" });
        const govde = r.status === 200 ? await r.text() : "";
        satirlar[i] = {
          adres: siteAdresi(WEB + y),
          yol: y,
          durum: r.status,
          metaRobots: govde ? robotsMeta(govde) : null,
          xRobotsTag: r.headers.get("x-robots-tag"),
          baslik: govde ? baslik(govde) : null,
          konum: r.headers.get("location"),
        };
      } catch {
        satirlar[i] = { adres: siteAdresi(WEB + y), yol: y, durum: 0, metaRobots: null, xRobotsTag: null, baslik: null, konum: null };
      }
    }
  }
  await Promise.all(Array.from({ length: AYNI_ANDA }, isci));
  const yanit: AltSayfaTaramasi = { temel: siteAdresi(WEB + temel), satirlar };
  return NextResponse.json(yanit);
}
