import { describe, expect, it } from "vitest";

import {
  deriveInputSection,
  deriveOutputText,
  formatUpstreamEdgeHint,
} from "@/lib/debugNodeIo";
import type { FlowNode } from "@/types/pipeline";

const exIdle = {
  nodeStatuses: {},
  streamingOutput: {},
  errors: [] as { node_id: string; message: string }[],
  runIdle: true,
};

const inputNode: FlowNode = {
  id: "n1",
  type: "input",
  position: { x: 0, y: 0 },
  data: { value: "hello" },
};

describe("formatUpstreamEdgeHint", () => {
  it("lists incoming source types", () => {
    const nodes: FlowNode[] = [
      inputNode,
      {
        id: "n2",
        type: "output",
        position: { x: 0, y: 0 },
        data: {},
      },
    ];
    const edges = [{ id: "e1", source: "n1", target: "n2" }];
    expect(formatUpstreamEdgeHint("n2", nodes, edges)).toContain("input");
  });
});

describe("deriveInputSection", () => {
  it("reads input node value from data", () => {
    const r = deriveInputSection(inputNode, [inputNode], [], exIdle, undefined);
    expect(r.text).toBe("hello");
    expect(r.partialNote).toBeNull();
  });
});

describe("deriveOutputText", () => {
  it("uses streaming output for llm when done", () => {
    const out = deriveOutputText(
      "L1",
      "llm",
      {
        nodeStatuses: { L1: "done" },
        streamingOutput: { L1: "final" },
        errors: [],
        runIdle: true,
      },
      undefined,
    );
    expect(out.text).toBe("final");
    expect(out.display).toBe("done");
  });

  it("prefers backend value when provided", () => {
    const out = deriveOutputText(
      "p1",
      "prompt",
      {
        nodeStatuses: { p1: "done" },
        streamingOutput: {},
        errors: [],
        runIdle: true,
      },
      { value: "resolved" },
    );
    expect(out.text).toBe("resolved");
    expect(out.partialNote).toBeNull();
  });
});
