import CommentsClient from "@/components/CommentsClient";

export const dynamic = "force-dynamic";

/** Yorum moderasyonu — tüm spor kollarındaki kullanıcı yorumları (EDITOR/ADMIN). */
export default function CommentsPage() {
  return <CommentsClient />;
}
