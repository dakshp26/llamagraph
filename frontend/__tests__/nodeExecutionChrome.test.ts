import { describe, expect, it } from "vitest";

import {
  nodeDebugInspectClass,
  nodeExecutionRingClass,
  nodeSkippedCardClass,
} from "@/lib/nodeExecutionChrome";

describe("nodeExecutionChrome", () => {
  it("uses blue pulsing ring for running", () => {
    expect(nodeExecutionRingClass("running")).toContain("ring-blue-500");
    expect(nodeExecutionRingClass("running")).toContain("flowai-running-ring");
  });

  it("uses green ring for done and red for error", () => {
    expect(nodeExecutionRingClass("done")).toContain("ring-emerald-500");
    expect(nodeExecutionRingClass("error")).toContain("ring-red-500");
  });

  it("uses grey ring for pending and skipped", () => {
    expect(nodeExecutionRingClass("pending")).toContain("ring-neutral-400");
    expect(nodeExecutionRingClass("skipped")).toContain("ring-neutral-400");
  });

  it("dims card only when skipped", () => {
    expect(nodeSkippedCardClass("skipped")).toContain("opacity-50");
    expect(nodeSkippedCardClass("done")).toBe("");
    expect(nodeSkippedCardClass(undefined)).toBe("");
  });

  it("outlines node when selected for debug panel", () => {
    expect(nodeDebugInspectClass(true)).toContain("outline-sky-500");
    expect(nodeDebugInspectClass(false)).toBe("");
    expect(nodeDebugInspectClass(undefined)).toBe("");
  });
});
