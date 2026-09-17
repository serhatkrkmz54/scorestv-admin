import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { UygulamaAyari, UygulamaAyariIstegi } from "@/lib/types";

/** Anahtar adı yalnız küçük harf, rakam ve alt çizgi — yol parçasına öyle giriyor. */
function anahtar(ham: string): string | null {
  return /^[a-z0-9_]{1,60}$/.test(ham) ? ham : null;
}

/** Bir ayarı değiştirir. Gerekçe zorunlu; yöneticinin adı gerekçeye eklenir. */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ anahtar: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const ad = anahtar((await ctx.params).anahtar);
  if (!ad) return NextResponse.json({ message: "Geçersiz anahtar." }, { status: 400 });

  let payload: UygulamaAyariIstegi;
  try {
    payload = (await req.json()) as UygulamaAyariIstegi;
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }
  if (typeof payload.deger !== "string") {
    return NextResponse.json({ message: "deger metin olmalı." }, { status: 400 });
  }

  const aktor = (izin.user.displayName || izin.user.email || "panel").trim();
  const r = await teleskorJson<UygulamaAyari>(
    `/api/v1/admin/uygulama-ayarlari/${encodeURIComponent(ad)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        deger: payload.deger,
        reason: `${(payload.reason ?? "").trim()} [panel: ${aktor}]`.trim(),
      }),
    },
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Ayar kaydedilemedi.");
}

/** Ayarı .env / katalog varsayılanına döndürür (satır silinir). */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ anahtar: string }> },
) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const ad = anahtar((await ctx.params).anahtar);
  if (!ad) return NextResponse.json({ message: "Geçersiz anahtar." }, { status: 400 });

  let payload: { reason?: string };
  try {
    payload = (await req.json()) as { reason?: string };
  } catch {
    payload = {};
  }
  const aktor = (izin.user.displayName || izin.user.email || "panel").trim();
  const r = await teleskorJson<UygulamaAyari>(
    `/api/v1/admin/uygulama-ayarlari/${encodeURIComponent(ad)}`,
    {
      method: "DELETE",
      body: JSON.stringify({
        reason: `${(payload.reason ?? "").trim()} [panel: ${aktor}]`.trim(),
      }),
    },
  );
  if (r.ok) return NextResponse.json(r.body);
  return teleskorResponse(r, "Ayar varsayılana döndürülemedi.");
}
