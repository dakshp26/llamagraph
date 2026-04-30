import {
  PIPELINE_FILE_SCHEMA_VERSION,
  type FlowEdge,
  type FlowNode,
  type FlowNodeData,
  type NodeType,
  type PipelineFile,
  type Viewport,
} from "@/types/pipeline";

const MAX_PIPELINE_FILE_BYTES = 2_000_000;
const MAX_PIPELINE_STRING_LENGTH = 20_000;
const MAX_VIEWPORT_COORDINATE = 100_000;
const MIN_VIEWPORT_ZOOM = 0.1;
const MAX_VIEWPORT_ZOOM = 4;

const NODE_TYPES = new Set<NodeType>([
  "input",
  "prompt",
  "transform",
  "condition",
  "llm",
  "output",
  "json_api",
]);

export function savePipeline(
  nodes: FlowNode[],
  edges: FlowEdge[],
  viewport: Viewport,
): void {
  const doc: PipelineFile = {
    schemaVersion: PIPELINE_FILE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    nodes,
    edges,
    viewport,
  };
  const blob = new Blob([JSON.stringify(doc, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `llamagraph-pipeline-${date}.llamagraph.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function loadPipelineFile(file: File): Promise<PipelineFile> {
  if (file.size > MAX_PIPELINE_FILE_BYTES) {
    throw new Error("This pipeline file is too large to load.");
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new Error("Couldn't read this file — it may be corrupted.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Couldn't read this file — it may be corrupted.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Couldn't read this file — it may be corrupted.");
  }

  const rec = parsed as Record<string, unknown>;
  if (rec.schemaVersion !== PIPELINE_FILE_SCHEMA_VERSION) {
    throw new Error(
      "This file was saved with a different version of LlamaGraph and can't be loaded.",
    );
  }

  if (!Array.isArray(rec.nodes) || !Array.isArray(rec.edges)) {
    throw new Error("Couldn't read this file — it may be corrupted.");
  }

  return {
    schemaVersion: PIPELINE_FILE_SCHEMA_VERSION,
    savedAt: getString(rec.savedAt, ""),
    nodes: rec.nodes.map(normalizeNode),
    edges: rec.edges.map(normalizeEdge),
    viewport: normalizeViewport(rec.viewport),
  };
}

function normalizeNode(value: unknown): FlowNode {
  if (!isRecord(value)) {
    throw new Error("This pipeline file has a malformed node.");
  }

  const id = value.id;
  const type = value.type;

  if (typeof id !== "string" || id.length === 0) {
    throw new Error("This pipeline file has a malformed node.");
  }

  if (typeof type !== "string" || !NODE_TYPES.has(type as NodeType)) {
    throw new Error("This pipeline file contains an unknown node type.");
  }

  if (!isRecord(value.position)) {
    throw new Error("This pipeline file has a malformed node.");
  }

  const data = isRecord(value.data) ? value.data : {};

  return {
    id,
    type: type as NodeType,
    position: {
      x: getFiniteNumber(value.position.x, 0),
      y: getFiniteNumber(value.position.y, 0),
    },
    data: normalizeNodeData(type as NodeType, data),
  };
}

function normalizeNodeData(type: NodeType, data: Record<string, unknown>): FlowNodeData {
  switch (type) {
    case "input":
      return { value: getBoundedString(data.value, "") };
    case "prompt":
      return { template: getBoundedString(data.template, "") };
    case "transform": {
      const mode = data.mode ?? "extract";
      if (mode !== "extract" && mode !== "template") {
        throw new Error("This pipeline file has a malformed node.");
      }
      return {
        mode,
        path: getBoundedString(data.path, ""),
        template: getBoundedString(data.template, ""),
      };
    }
    case "condition":
      return { pattern: getBoundedString(data.pattern, "") };
    case "llm":
      return {
        model: getBoundedString(data.model, "llama3.2"),
        temperature: getFiniteNumber(data.temperature, 0.7),
        systemPrompt: getBoundedString(data.systemPrompt, ""),
      };
    case "output":
      return {};
    case "json_api": {
      const params = Array.isArray(data.params) ? data.params : [];
      const headers = Array.isArray(data.headers) ? data.headers : [];
      return {
        url: getBoundedString(data.url, ""),
        params: params.map((p: unknown) => {
          const r = isRecord(p) ? p : {};
          return { id: getBoundedString(r.id, crypto.randomUUID()), key: getBoundedString(r.key, ""), value: getBoundedString(r.value, "") };
        }),
        headers: headers.map((h: unknown) => {
          const r = isRecord(h) ? h : {};
          return { id: getBoundedString(r.id, crypto.randomUUID()), key: getBoundedString(r.key, ""), value: getBoundedString(r.value, "") };
        }),
      };
    }
  }
}

function normalizeEdge(value: unknown): FlowEdge {
  if (!isRecord(value)) {
    throw new Error("This pipeline file has a malformed edge.");
  }

  const { id, source, target } = value;
  if (
    typeof id !== "string" ||
    id.length === 0 ||
    typeof source !== "string" ||
    source.length === 0 ||
    typeof target !== "string" ||
    target.length === 0
  ) {
    throw new Error("This pipeline file has a malformed edge.");
  }

  const edge: FlowEdge = { id, source, target };
  if (typeof value.sourceHandle === "string" || value.sourceHandle === null) {
    edge.sourceHandle = value.sourceHandle;
  }
  if (typeof value.targetHandle === "string" || value.targetHandle === null) {
    edge.targetHandle = value.targetHandle;
  }
  return edge;
}

function normalizeViewport(value: unknown): Viewport {
  const rec = isRecord(value) ? value : {};
  return {
    x: clamp(getFiniteNumber(rec.x, 0), -MAX_VIEWPORT_COORDINATE, MAX_VIEWPORT_COORDINATE),
    y: clamp(getFiniteNumber(rec.y, 0), -MAX_VIEWPORT_COORDINATE, MAX_VIEWPORT_COORDINATE),
    zoom: clamp(getFiniteNumber(rec.zoom, 1), MIN_VIEWPORT_ZOOM, MAX_VIEWPORT_ZOOM),
  };
}

function getString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function getBoundedString(value: unknown, fallback: string): string {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value !== "string") {
    throw new Error("This pipeline file has a malformed node.");
  }
  if (value.length > MAX_PIPELINE_STRING_LENGTH) {
    throw new Error("This pipeline file has a field that is too long.");
  }
  return value;
}

function getFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
