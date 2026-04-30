import type { NodeType } from "@/types/pipeline";

export interface NodeMeta {
  label: string;
  abbr: string;
  color: string;
}

export const NODE_META: Record<NodeType, NodeMeta> = {
  input:     { label: "Input",     abbr: "IN", color: "#4d8ef0" },
  prompt:    { label: "Prompt",    abbr: "PR", color: "#9d78e8" },
  transform: { label: "Transform", abbr: "TR", color: "#e8a030" },
  condition: { label: "Condition", abbr: "CO", color: "#e85858" },
  llm:       { label: "LLM",       abbr: "LM", color: "#16c784" },
  output:    { label: "Output",    abbr: "OU", color: "#22cde8" },
  json_api:  { label: "JSON API",  abbr: "JA", color: "#f97316" },
};

export interface NodeCategory {
  label: string;
  types: NodeType[];
}

export const NODE_CATEGORIES: NodeCategory[] = [
  { label: "sources",    types: ["input", "json_api"] },
  { label: "processing", types: ["prompt", "transform", "condition", "llm"] },
  { label: "sinks",      types: ["output"] },
];

export function nodeColor(type: string | undefined): string {
  return (NODE_META as Record<string, NodeMeta>)[type ?? ""]?.color ?? "#555";
}
