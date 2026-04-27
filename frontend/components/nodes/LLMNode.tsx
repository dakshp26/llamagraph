"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

import { NodeStatusBadge } from "@/components/ui/NodeStatusBadge";
import { NodeValidationBadge } from "@/components/ui/NodeValidationBadge";
import {
  nodeDebugInspectClass,
  nodeExecutionRingClass,
  nodeSkippedCardClass,
} from "@/lib/nodeExecutionChrome";
import { useExecutionStore } from "@/store/executionStore";
import { usePipelineStore } from "@/store/pipelineStore";
import type { FlowNode, LLMNodeData } from "@/types/pipeline";

export function LLMNode({ id, data, selected }: NodeProps<FlowNode>) {
  const d = data as LLMNodeData;
  const updateNodeData = usePipelineStore((s) => s.updateNodeData);
  const ollamaModels = useExecutionStore((s) => s.ollamaModels);
  const nodeStatus = useExecutionStore((s) => s.nodeStatuses[id]);
  const streamingText = useExecutionStore((s) => s.streamingOutput[id] ?? "");

  const modelOptions =
    d.model && !ollamaModels.includes(d.model) ? [d.model, ...ollamaModels] : ollamaModels;

  const showThinking =
    nodeStatus === "running" &&
    streamingText.length === 0;

  return (
    <div
      className={`relative min-w-[260px] max-w-[300px] rounded-lg border-2 border-amber-500 bg-white px-3 py-2 pl-7 pr-7 text-sm text-neutral-800 shadow-sm ${nodeExecutionRingClass(nodeStatus)} ${nodeSkippedCardClass(nodeStatus)} ${nodeDebugInspectClass(selected)}`}
      data-testid={`node-llm-${id}`}
    >
      <NodeStatusBadge status={nodeStatus} />
      <NodeValidationBadge nodeId={id} />
      <Handle
        className="!h-3 !w-3 !border-2 !border-white !bg-amber-500"
        position={Position.Top}
        type="target"
      />
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">LLM</div>

      <label className="block text-xs font-medium text-neutral-600" htmlFor={`llm-model-${id}`}>
        Model
      </label>
      <select
        className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        id={`llm-model-${id}`}
        value={d.model}
        onChange={(e) => updateNodeData(id, { model: e.target.value })}
      >
        {modelOptions.length === 0 ? (
          <option value={d.model}>{d.model || "No models — start Ollama"}</option>
        ) : (
          modelOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))
        )}
      </select>

      <label
        className="mt-2 block text-xs font-medium text-neutral-600"
        htmlFor={`llm-temp-${id}`}
      >
        Temperature {d.temperature.toFixed(1)}
      </label>
      <input
        className="mt-1 w-full accent-amber-600"
        id={`llm-temp-${id}`}
        max={1}
        min={0}
        step={0.1}
        type="range"
        value={d.temperature}
        onChange={(e) => updateNodeData(id, { temperature: Number(e.target.value) })}
      />

      <details className="mt-2 rounded border border-neutral-200 bg-neutral-50">
        <summary className="cursor-pointer select-none px-2 py-1.5 text-xs font-medium text-neutral-700">
          Advanced
        </summary>
        <div className="border-t border-neutral-200 p-2">
          <label className="block text-xs text-neutral-600" htmlFor={`llm-sys-${id}`}>
            System prompt
          </label>
          <textarea
            className="mt-1 w-full resize-y rounded border border-neutral-300 bg-white px-2 py-1 text-xs outline-none focus:border-amber-500"
            id={`llm-sys-${id}`}
            rows={3}
            value={d.systemPrompt}
            onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
          />
        </div>
      </details>

      <div className="mt-2">
        {showThinking ? (
          <div className="flex items-center gap-2 text-xs text-neutral-600">
            <span
              aria-hidden
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-300 border-t-amber-600"
            />
            Thinking…
          </div>
        ) : (
          <textarea
            readOnly
            className="w-full resize-y rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 font-mono text-[11px] text-neutral-800"
            placeholder="Response appears while running…"
            rows={4}
            value={streamingText}
          />
        )}
      </div>

      <Handle
        className="!h-3 !w-3 !border-2 !border-white !bg-amber-500"
        position={Position.Bottom}
        type="source"
      />
    </div>
  );
}
