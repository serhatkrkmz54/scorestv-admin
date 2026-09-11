import { NextResponse, type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { VeriKaydi } from "@/lib/types";

/** Bir kaydın yamalanabilir alanları: şu anki değer, yama ve sağlayıcı sapması. */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const sp = req.nextUrl.searchParams;
  const tur = sp.get("tur");
  const id = sp.get("id");
  if (!tur || !id || !/^\d+$/.test(id)) {
    return NextResponse.json({ message: "tur ve id zorunlu." }, { status: 400 });
  }

  const r = await teleskorJson<VeriKaydi>(
    `/api/v1/admin/engine/veri/kayit?tur=${encodeURIComponent(tur)}&id=${id}`,
  );
  return teleskorResponse(r, "Kayıt alınamadı.");
}
