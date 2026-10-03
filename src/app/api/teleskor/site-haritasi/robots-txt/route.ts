import { NextResponse } from "next/server";
import { webGetir } from "@/lib/site-web";
import { teleskorSiteHaritasi } from "@/lib/teleskor-guard";

/** Sitenin CANLI robots.txt'si (sabit kurallar + panelden eklenenler, arama motorunun gördüğü hâli). */
export async function GET() {
  const izin = await teleskorSiteHaritasi();
  if ("error" in izin) return izin.error;
  try {
    const y = await webGetir("/robots.txt");
    if (!y.ok) return NextResponse.json({ message: `robots.txt okunamadı (${y.status}).` }, { status: 502 });
    return NextResponse.json({ metin: await y.text() });
  } catch {
    return NextResponse.json({ message: "Siteye ulaşılamadı." }, { status: 502 });
  }
}
