import { type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

/**
 * TELESKOR HABERLERİ (V69) — liste ve yeni haber.
 *
 * Haberler Teleskor'un kendi tablosunda (`/api/v1/admin/haber`).
 */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const p = req.nextUrl.searchParams;
  const q = new URLSearchParams();
  const durum = p.get("durum");
  if (durum && /^(TASLAK|ZAMANLI|YAYINDA|ARSIV)$/.test(durum)) q.set("durum", durum);
  const ara = (p.get("q") ?? "").trim().slice(0, 100);
  if (ara) q.set("q", ara);
  const sayfa = Number(p.get("sayfa") ?? "0");
  q.set("sayfa", String(Number.isInteger(sayfa) && sayfa >= 0 ? sayfa : 0));
  q.set("boyut", "30");
  const r = await teleskorJson(`/api/v1/admin/haber?${q.toString()}`);
  return teleskorResponse(r, "Haber listesi alınamadı.");
}

export async function POST(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const govde = await req.text();
  const r = await teleskorJson(`/api/v1/admin/haber`, { method: "POST", body: govde });
  return teleskorResponse(r, "Haber kaydedilemedi.");
}
