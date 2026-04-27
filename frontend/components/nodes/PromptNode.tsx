"use client";

import { Fragment, useEffect } from "react";

import { Handle, Position, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";

import { NodeStatusBadge } from "@/components/ui/NodeStatusBadge";
import { NodeValidationBadge } from "@/components/ui/NodeValidationBadge";
import { extractPromptPlaceholders } from "@/lib/promptPlaceholders";
import {
  nodeDebugInspectClass,
  nodeExecutionRingClass,
  nodeSkippedCardClass,
} from "@/lib/nodeExecutionChrome";
import { useExecutionStore } from "@/store/executionStore";
import { usePipelineStore } from "@/store/pipelineStore";
import type { FlowNode, PromptNodeData } from "@/types/pipeline";

export function PromptNode({ id, data, selected }: NodeProps<FlowNode>) {
  const d = data as PromptNodeData;
  const updateNodeData = usePipelineStore((s) => s.updateNodeData);
  const updateNodeInternals = useUpdateNodeInternals();
  const placeholders = extractPromptPlaceholders(d.template);
  const nodeStatus = useExecutionStore((s) => s.nodeStatuses[id]);
  const hasPlaceholders = placeholders.length > 0;
  const placeholderSignature = placeholders.join("\u0001");

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, placeholderSignature, updateNodeInternals]);

  return (
    <div
      className={`relative min-w-[240px] max-w-[280px] rounded-lg border-2 border-violet-500 bg-white px-3 py-2 pl-7 pr-7 text-sm text-neutral-800 shadow-sm ${hasPlaceholders ? "pt-6" : ""} ${nodeExecutionRingClass(nodeStatus)} ${nodeSkippedCardClass(nodeStatus)} ${nodeDebugInspectClass(selected)}`}
      title="Use {{variable_name}} to insert output from connected blocks"
      data-testid={`node-prompt-${id}`}
    >
      <NodeStatusBadge status={nodeStatus} />
      <NodeValidationBadge nodeId={id} />
      {hasPlaceholders &&
        placeholders.map((name, i) => {
          const left = `${((i + 1) / (placeholders.length + 1)) * 100}%`;
          return (
            <Fragment key={name}>
              <Handle
                className="!h-3 !w-3 !border-2 !border-white !bg-violet-500"
                id={name}
                position={Position.Top}
                style={{ left }}
                type="target"
              />
              <span
                className="pointer-events-none absolute z-0 max-w-[5.5rem] -translate-x-1/2 truncate text-center font-mono text-[10px] leading-tight text-violet-800"
                style={{ left, top: 12 }}
              >
                {name}
              </span>
            </Fragment>
          );
        })}
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-violet-800">
        Prompt
      </div>
      <label className="block text-xs font-medium text-neutral-600" htmlFor={`prompt-${id}`}>
        Template
      </label>
      <textarea
        className="mt-1 w-full resize-y rounded border border-neutral-300 bg-white px-2 py-1.5 font-mono text-xs outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        id={`prompt-${id}`}
        rows={4}
        value={d.template}
        onChange={(e) => updateNodeData(id, { template: e.target.value })}
      />
      {placeholders.length > 0 && (
        <div className="mt-2 border-t border-neutral-100 pt-2">
          <div className="text-[11px] font-medium text-neutral-500">Placeholders</div>
          <ul className="mt-1 flex flex-wrap gap-1">
            {placeholders.map((name) => (
              <li
                key={name}
                className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] text-violet-900"
              >
                {`{{${name}}}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Handle
        className="!h-3 !w-3 !border-2 !border-white !bg-violet-500"
        position={Position.Bottom}
        type="source"
      />
    </div>
  );
}
