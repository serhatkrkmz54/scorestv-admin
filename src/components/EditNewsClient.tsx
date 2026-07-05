"use client";

import NewsForm, { initialFromDetail } from "./NewsForm";
import type { NewsDetail } from "@/lib/types";

export default function EditNewsClient({ detail }: { detail: NewsDetail }) {
  return <NewsForm initial={initialFromDetail(detail)} />;
}
