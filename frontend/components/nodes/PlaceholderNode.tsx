"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

import { nodeDebugInspectClass } from "@/lib/nodeExecutionChrome";
import type { FlowNode } from "@/types/pipeline";

const LABELS: Record<string, string> = {
  input: "Input",
  prompt: "Prompt",
  transform: "Transform",
  condition: "Condition",
  llm: "LLM",
  output: "Output",
};

export function PlaceholderNode({ type, selected }: NodeProps<FlowNode>) {
  const label = (type && LABELS[type]) || "Node";
  return (
    <div
      className={`min-w-[120px] rounded-lg border-2 border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm ${nodeDebugInspectClass(selected)}`}
    >
      <Handle className="!bg-neutral-500" position={Position.Top} type="target" />
      <span className="font-medium">{label}</span>
      <Handle className="!bg-neutral-500" position={Position.Bottom} type="source" />
    </div>
  );
}
