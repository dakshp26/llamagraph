import type { Edge, Node, Viewport } from "@xyflow/react";

export type { Viewport };

export type NodeType =
  | "input"
  | "prompt"
  | "transform"
  | "condition"
  | "llm"
  | "output";

export interface InputNodeData extends Record<string, unknown> {
  value: string;
}

export interface PromptNodeData extends Record<string, unknown> {
  template: string;
}

export interface TransformNodeData extends Record<string, unknown> {
  mode: "extract" | "template";
  path: string;
  template: string;
}

export interface ConditionNodeData extends Record<string, unknown> {
  pattern: string;
}

export interface LLMNodeData extends Record<string, unknown> {
  model: string;
  temperature: number;
  systemPrompt: string;
}

export interface OutputNodeData extends Record<string, unknown> {
  /** Filled by client after run if needed */
  lastRunAt?: string;
}

export type FlowNodeData =
  | InputNodeData
  | PromptNodeData
  | TransformNodeData
  | ConditionNodeData
  | LLMNodeData
  | OutputNodeData;

export type FlowNode = Node<FlowNodeData, NodeType>;

export type FlowEdge = Edge;

/** Wire format for POST /pipeline/validate and /pipeline/run */
export interface GraphNodePayload {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface GraphEdgePayload {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface GraphPayload {
  nodes: GraphNodePayload[];
  edges: GraphEdgePayload[];
}

export interface ValidationErrorItem {
  node_id: string | null;
  message: string;
}

export interface ValidateResponse {
  valid: boolean;
  errors: ValidationErrorItem[];
}

export const PIPELINE_FILE_SCHEMA_VERSION = 1 as const;

export interface PipelineFile {
  schemaVersion: typeof PIPELINE_FILE_SCHEMA_VERSION;
  savedAt: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: Viewport;
}

export function defaultNodeData(type: NodeType): FlowNodeData {
  switch (type) {
    case "input":
      return { value: "" };
    case "prompt":
      return { template: "" };
    case "transform":
      return { mode: "extract", path: "", template: "" };
    case "condition":
      return { pattern: "" };
    case "llm":
      return { model: "llama3.2", temperature: 0.7, systemPrompt: "" };
    case "output":
      return {};
  }
}

export function toGraphPayload(nodes: FlowNode[], edges: FlowEdge[]): GraphPayload {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      data: { ...(n.data as Record<string, unknown>) },
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
    })),
  };
}
