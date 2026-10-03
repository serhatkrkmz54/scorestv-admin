import { NextResponse, type NextRequest } from "next/server";
import { siteAdresi, webGetir, xmlCoz } from "@/lib/site-web";
import { teleskorSiteHaritasi } from "@/lib/teleskor-guard";
import type { SiteHaritasiDosyasi } from "@/lib/types";

/** Yalnız sitenin harita dosyaları (".xml" ile biten yol). */
const DOSYA = /^\/[A-Za-z0-9._/-]{1,200}\.xml$/;
const EN_COK = 500;

/**
 * Bir harita dosyasının içi: dizinse dosya listesi, değilse adresler
 * (öncelik, sıklık, son değişiklik). `q` adreste geçen metne göre süzer;
 * ilk {@link EN_COK} satır döner, toplam ayrıca.
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorSiteHaritasi();
  if ("error" in izin) return izin.error;
  const yol = req.nextUrl.searchParams.get("yol") ?? "/sitemap.xml";
  if (!DOSYA.test(yol) || yol.includes("..")) {
    return NextResponse.json({ message: "Geçersiz dosya adı." }, { status: 400 });
  }
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLocaleLowerCase("tr");
  const t0 = Date.now();
  let metin: string;
  try {
    const y = await webGetir(yol);
    if (!y.ok) {
      return NextResponse.json(
        { message: y.status === 404 ? "Bu dosya sitede yok (tür kapalı olabilir)." : `Dosya okunamadı (${y.status}).` },
        { status: y.status === 404 ? 404 : 502 },
      );
    }
    metin = await y.text();
  } catch {
    return NextResponse.json({ message: "Siteye ulaşılamadı." }, { status: 502 });
  }
  const sure = Date.now() - t0;
  const dizin = metin.includes("<sitemapindex");
  const satirlar: SiteHaritasiDosyasi["satirlar"] = [];
  {
    // Dizinde <sitemap>, haritada <url> blokları; ikisinde de loc + (varsa) lastmod.
    const re = dizin ? /<sitemap>([\s\S]*?)<\/sitemap>/g : /<url>([\s\S]*?)<\/url>/g;
    for (let m = re.exec(metin); m; m = re.exec(metin)) {
      const blok = m[1];
      const al = (ad: string) => {
        const x = new RegExp(`<${ad}>([\\s\\S]*?)</${ad}>`).exec(blok);
        return x ? xmlCoz(x[1].trim()) : undefined;
      };
      satirlar.push({
        loc: siteAdresi(al("loc") ?? ""),
        lastmod: al("lastmod"),
        changefreq: al("changefreq"),
        priority: al("priority"),
      });
    }
  }
  const suzulu = q ? satirlar.filter((s) => s.loc.toLocaleLowerCase("tr").includes(q)) : satirlar;
  const yanit: SiteHaritasiDosyasi = {
    yol,
    tur: dizin ? "dizin" : "adresler",
    toplam: satirlar.length,
    eslesen: suzulu.length,
    lastmodSayisi: satirlar.filter((s) => s.lastmod).length,
    satirlar: suzulu.slice(0, EN_COK),
    sure,
    boyut: metin.length,
  };
  return NextResponse.json(yanit);
}
