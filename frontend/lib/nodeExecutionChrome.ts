import type { NodeRunStatus } from "@/store/executionStore";

/** Outer ring + optional pulse for execution state (see globals `.flowai-running-ring`). */
export function nodeExecutionRingClass(status: NodeRunStatus | undefined): string {
  if (status === "running") {
    return "ring-2 ring-blue-500 ring-offset-2 flowai-running-ring";
  }
  if (status === "done") return "ring-2 ring-emerald-500 ring-offset-2";
  if (status === "error") return "ring-2 ring-red-500 ring-offset-2";
  if (status === "skipped") return "ring-2 ring-neutral-400 ring-offset-2";
  if (status === "pending") return "ring-2 ring-neutral-400 ring-offset-2";
  return "";
}

/** Whole-card dim when branch skipped. */
export function nodeSkippedCardClass(status: NodeRunStatus | undefined): string {
  return status === "skipped" ? "opacity-50" : "";
}

/** Outline when the node is selected (same state as the debug panel I/O view). */
export function nodeDebugInspectClass(selected: boolean | undefined): string {
  return selected ? "z-10 outline outline-[2px] outline-sky-500 outline-offset-2" : "";
}
