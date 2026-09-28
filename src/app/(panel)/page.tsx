import { redirect } from "next/navigation";

/** Panelin açılış sayfası: Sistem Sağlığı (menüde "Genel"). */
export default function HomePage() {
  redirect("/teleskor/saglik");
}
