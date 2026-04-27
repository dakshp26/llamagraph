"use client";

import type { NodeRunStatus } from "@/store/executionStore";

const LABEL: Record<NodeRunStatus, string> = {
  pending: "Pending",
  running: "Running",
  done: "Done",
  error: "Error",
  skipped: "Skipped",
};

export function NodeStatusBadge({ status }: { status: NodeRunStatus | undefined }) {
  if (!status) return null;

  const color =
    status === "pending"
      ? "bg-neutral-400"
      : status === "running"
        ? "bg-blue-500"
        : status === "done"
          ? "bg-emerald-500"
          : status === "error"
            ? "bg-red-500"
            : "bg-neutral-400";

  return (
    <span
      aria-label={LABEL[status]}
      className="pointer-events-none absolute left-2 top-2 z-10 flex h-2 w-2 items-center justify-center"
      title={LABEL[status]}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}
