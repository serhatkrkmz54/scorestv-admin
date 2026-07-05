import type { NewsStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/labels";

// Yumuşak zemin + renkli metin pill'i. Renkler globals.css durum tokenlarından
// gelir (badge-published/scheduled/draft/archived).
const CLASS: Record<NewsStatus, string> = {
  DRAFT: "badge-draft",
  PUBLISHED: "badge-published",
  SCHEDULED: "badge-scheduled",
  ARCHIVED: "badge-archived",
};

export default function StatusBadge({ status }: { status: NewsStatus }) {
  return (
    <span className={`badge ${CLASS[status]}`}>
      <span className="badge-dot" />
      {STATUS_LABELS[status]}
    </span>
  );
}
