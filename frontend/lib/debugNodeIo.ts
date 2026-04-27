import type { Edge } from "@xyflow/react";

import type { FlowNode, NodeType } from "@/types/pipeline";
import type { NodeRunStatus } from "@/store/executionStore";

export type IoDisplayState =
  | "empty"
  | "idle"
  | "pending"
  | "running"
  | "done"
  | "error"
  | "skipped";

export interface NodeIoBackendHints {
  /** From executor `node_status` done payload when present */
  value?: string;
  input?: string;
}

export interface NodeIoExecutionSlice {
  nodeStatuses: Record<string, NodeRunStatus>;
  streamingOutput: Record<string, string>;
  /** Last message per node id (optional; we scan errors array) */
  errors: { node_id: string; message: string }[];
  runIdle: boolean;
}

function errorForNode(
  nodeId: string,
  errors: { node_id: string; message: string }[],
): string | undefined {
  for (let i = errors.length - 1; i >= 0; i--) {
    if (errors[i]!.node_id === nodeId) return errors[i]!.message;
  }
  return undefined;
}

function dataAsRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

/** Best-effort upstream label list for the debug panel. */
export function formatUpstreamEdgeHint(
  nodeId: string,
  nodes: FlowNode[],
  edges: Edge[],
): string {
  const inc = edges.filter((e) => e.target === nodeId);
  if (inc.length === 0) return "No incoming edges.";
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return inc
    .map((e) => {
      const n = byId.get(e.source);
      const t = n?.type ?? "?";
      return `${t}`;
    })
    .join(" · ");
}

export function deriveInputSection(
  node: FlowNode,
  nodes: FlowNode[],
  edges: Edge[],
  ex: NodeIoExecutionSlice,
  backend: NodeIoBackendHints | undefined,
): { text: string; partialNote: string | null } {
  if (backend?.input != null && backend.input.length > 0) {
    return { text: backend.input, partialNote: null };
  }

  const d = dataAsRecord(node.data);
  const kind: NodeType = node.type;
  const partial = "Heuristic from graph; not the runtime executor payload.";

  if (kind === "input") {
    return { text: str(d.value), partialNote: null };
  }
  if (kind === "prompt") {
    return { text: str(d.template), partialNote: partial };
  }
  if (kind === "transform") {
    const mode = str(d.mode);
    const path = str(d.path);
    const tpl = str(d.template);
    if (mode === "template") {
      return { text: tpl || "(empty template)", partialNote: partial };
    }
    return { text: path ? `path: ${path}` : "(no path)", partialNote: partial };
  }
  if (kind === "condition") {
    return { text: str(d.pattern) || "(no pattern)", partialNote: partial };
  }
  if (kind === "llm" || kind === "output") {
    return {
      text: `Upstream (best effort): ${formatUpstreamEdgeHint(node.id, nodes, edges)}`,
      partialNote: partial,
    };
  }
  return { text: formatUpstreamEdgeHint(node.id, nodes, edges), partialNote: partial };
}

function hasStreamOutput(nodeId: string, ex: NodeIoExecutionSlice): boolean {
  return Object.prototype.hasOwnProperty.call(ex.streamingOutput, nodeId);
}

export function deriveOutputDisplayState(
  nodeId: string,
  type: NodeType,
  ex: NodeIoExecutionSlice,
  backendValue?: string,
): IoDisplayState {
  if (typeof backendValue === "string") return "done";
  const st = ex.nodeStatuses[nodeId];
  const err = errorForNode(nodeId, ex.errors);
  if (err) return "error";
  if (st === "error") return "error";
  if (st === "skipped") return "skipped";
  if (st === "pending") return "pending";
  if (st === "running") return "running";
  if (st === "done") return "done";
  if (ex.runIdle && (type === "llm" || type === "output") && hasStreamOutput(nodeId, ex)) {
    return "done";
  }
  if (!st && ex.runIdle) return "idle";
  return "empty";
}

export function deriveOutputText(
  nodeId: string,
  type: NodeType,
  ex: NodeIoExecutionSlice,
  backend: NodeIoBackendHints | undefined,
): { text: string; errorMessage?: string; partialNote: string | null; display: IoDisplayState } {
  const err = errorForNode(nodeId, ex.errors);
  const st = ex.nodeStatuses[nodeId];
  const display = deriveOutputDisplayState(nodeId, type, ex, backend?.value);
  if (err || st === "error") {
    return {
      text: "",
      errorMessage: err ?? "This node reported an error.",
      partialNote: null,
      display: "error",
    };
  }
  if (st === "skipped" || display === "skipped") {
    return { text: "", partialNote: null, display: "skipped" };
  }
  if (display === "pending" || display === "idle" || display === "empty") {
    const msg =
      display === "pending"
        ? "Not run yet (pending)."
        : "Not run yet for this node.";
    return {
      text: msg,
      partialNote: null,
      display: display === "empty" ? "empty" : display,
    };
  }
  if (display === "running") {
    const t = ex.streamingOutput[nodeId] ?? "";
    return { text: t, partialNote: null, display: "running" };
  }

  if (backend?.value != null) {
    return { text: backend.value, partialNote: null, display: "done" };
  }
  if (type === "llm" || type === "output") {
    return {
      text: ex.streamingOutput[nodeId] ?? "",
      partialNote: null,
      display: "done",
    };
  }
  return {
    text: ex.streamingOutput[nodeId] ?? "(no final value in client state)",
    partialNote: "Runtime final string not in SSE for this type yet (executor extension optional).",
    display: "done",
  };
}

export function isPrimaryStreamNodeType(t: NodeType): boolean {
  return t === "llm" || t === "output";
}
