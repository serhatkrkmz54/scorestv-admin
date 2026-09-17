import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { CanliTakipAyari, CanliTakipIstegi } from "@/lib/types";

/**
 * CANLI TAKİP WIDGET'I — maç detayındaki animasyonlu saha (iframe).
 *
 * <p>Anahtar api-1'de (`uygulama_ayari`, V67). Kapalıyken api-1 maç
 * detayındaki `hasLiveTracker` bayrağını false'a çekiyor; uygulamanın
 * bütün sürümleri o bayrağa baktığı için mağazadaki sürüm de kapanıyor.
 */
export async function GET() {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const r = await teleskorJson<CanliTakipAyari>(
    "/api/v1/admin/uygulama-ayarlari/canli-takip",
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Ayar okunamadı.");
}

export async function PUT(req: NextRequest) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  let payload: CanliTakipIstegi;
  try {
    payload = (await req.json()) as CanliTakipIstegi;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  if (typeof payload.acik !== "boolean") {
    return NextResponse.json(
      { message: "acik alanı true/false olmalı." },
      { status: 400 },
    );
  }

  // KİM YAPTI gerekçeye ekleniyor (öne çıkan liglerle aynı kalıp):
  // Teleskor isteği tek servis hesabıyla görüyor.
  const aktor = (izin.user.displayName || izin.user.email || "panel").trim();
  const r = await teleskorJson<CanliTakipAyari>(
    "/api/v1/admin/uygulama-ayarlari/canli-takip",
    {
      method: "PUT",
      body: JSON.stringify({
        acik: payload.acik,
        reason: `${(payload.reason ?? "").trim()} [panel: ${aktor}]`.trim(),
      }),
    },
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Ayar kaydedilemedi.");
}
