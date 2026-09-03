import { type NextRequest } from "next/server";
import { teleskorJson } from "@/lib/teleskor";
import { teleskorAdmin, teleskorResponse } from "@/lib/teleskor-guard";
import type { TeleskorDestekTalebi } from "@/lib/types";

/** Destek talepleri — süzgeç verilmezse KAPALI olmayanlar. */
export async function GET(req: NextRequest) {
  const izin = await teleskorAdmin();
  if ("error" in izin) return izin.error;

  const durum = req.nextUrl.searchParams.get("durum");
  const limit = req.nextUrl.searchParams.get("limit") ?? "100";
  const sorgu = new URLSearchParams({ limit });
  if (durum) sorgu.set("durum", durum);

  const r = await teleskorJson<TeleskorDestekTalebi[]>(
    `/api/v1/admin/destek?${sorgu.toString()}`,
  );
  return teleskorResponse(r, "Destek talepleri alınamadı.");
}
