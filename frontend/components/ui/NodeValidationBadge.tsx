"use client";

import { formatValidationMessage } from "@/lib/formatValidationMessage";
import { useValidationStore } from "@/store/validationStore";

export function NodeValidationBadge({ nodeId }: { nodeId: string }) {
  /** Single string so the selector snapshot is stable (arrays break useSyncExternalStore). */
  const issueDetail = useValidationStore((s) =>
    s.issues
      .filter((i) => i.node_id === nodeId)
      .map((i) => formatValidationMessage(i.message))
      .join("\n"),
  );

  if (!issueDetail) return null;

  return (
    <span
      className="pointer-events-auto absolute right-1.5 top-1.5 z-10 flex h-5 w-5 cursor-default items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white shadow-sm"
      title={issueDetail}
    >
      !
    </span>
  );
}
