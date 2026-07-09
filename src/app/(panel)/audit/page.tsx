import AuditClient from "@/components/AuditClient";

export const dynamic = "force-dynamic";

/** Denetim günlüğü — kim ne zaman hangi habere hangi eylemi uyguladı (EDITOR/ADMIN). */
export default function AuditPage() {
  return <AuditClient />;
}
