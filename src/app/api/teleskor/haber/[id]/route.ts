import { NextResponse, type NextRequest } from "next/server";
import { checkSameOrigin } from "@/lib/origin-check";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";

type Baglam = { params: Promise<{ id: string }> };

async function kimlik(baglam: Baglam): Promise<string | null> {
  const { id } = await baglam.params;
  return /^\d{1,12}$/.test(id) ? id : null;
}

export async function GET(_req: NextRequest, baglam: Baglam) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const id = await kimlik(baglam);
  if (!id) return NextResponse.json({ message: "Geçersiz haber." }, { status: 400 });
  const r = await teleskorJson(`/api/v1/admin/haber/${id}`);
  return teleskorResponse(r, "Haber alınamadı.");
}

export async function PUT(req: NextRequest, baglam: Baglam) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const id = await kimlik(baglam);
  if (!id) return NextResponse.json({ message: "Geçersiz haber." }, { status: 400 });
  const govde = await req.text();
  const r = await teleskorJson(`/api/v1/admin/haber/${id}`, { method: "PUT", body: govde });
  return teleskorResponse(r, "Haber kaydedilemedi.");
}

export async function DELETE(req: NextRequest, baglam: Baglam) {
  const bad = checkSameOrigin(req);
  if (bad) return bad;
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;
  const id = await kimlik(baglam);
  if (!id) return NextResponse.json({ message: "Geçersiz haber." }, { status: 400 });
  const r = await teleskorJson(`/api/v1/admin/haber/${id}`, { method: "DELETE" });
  return teleskorResponse(r, "Haber silinemedi.");
}
