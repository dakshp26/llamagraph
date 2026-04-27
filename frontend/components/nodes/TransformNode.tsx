"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useMemo } from "react";

import { NodeStatusBadge } from "@/components/ui/NodeStatusBadge";
import { NodeValidationBadge } from "@/components/ui/NodeValidationBadge";
import { previewTransformExtract, previewTransformTemplate } from "@/lib/transformPreview";
import {
  nodeDebugInspectClass,
  nodeExecutionRingClass,
  nodeSkippedCardClass,
} from "@/lib/nodeExecutionChrome";
import { useExecutionStore } from "@/store/executionStore";
import { usePipelineStore } from "@/store/pipelineStore";
import type { FlowNode, TransformNodeData } from "@/types/pipeline";

export function TransformNode({ id, data, selected }: NodeProps<FlowNode>) {
  const d = data as TransformNodeData;
  const updateNodeData = usePipelineStore((s) => s.updateNodeData);
  const nodeStatus = useExecutionStore((s) => s.nodeStatuses[id]);

  const preview = useMemo(() => {
    if (d.mode === "template") {
      return previewTransformTemplate(d.template);
    }
    return previewTransformExtract(d.path);
  }, [d.mode, d.path, d.template]);

  return (
    <div
      className={`relative min-w-[260px] max-w-[320px] rounded-lg border-2 border-cyan-600 bg-white px-3 py-2 pl-7 pr-7 text-sm text-neutral-800 shadow-sm ${nodeExecutionRingClass(nodeStatus)} ${nodeSkippedCardClass(nodeStatus)} ${nodeDebugInspectClass(selected)}`}
      data-testid={`node-transform-${id}`}
    >
      <NodeStatusBadge status={nodeStatus} />
      <NodeValidationBadge nodeId={id} />
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-800">
        Transform
      </div>
      <fieldset className="space-y-2 border-0 p-0">
        <legend className="sr-only">Transform mode</legend>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-700">
          <input
            checked={d.mode === "extract"}
            className="accent-cyan-600"
            name={`mode-${id}`}
            type="radio"
            onChange={() => updateNodeData(id, { mode: "extract" })}
          />
          Extract JSON field
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-700">
          <input
            checked={d.mode === "template"}
            className="accent-cyan-600"
            name={`mode-${id}`}
            type="radio"
            onChange={() => updateNodeData(id, { mode: "template" })}
          />
          Text template
        </label>
      </fieldset>

      {d.mode === "extract" ? (
        <div className="mt-2 space-y-1">
          <label className="block text-xs font-medium text-neutral-600" htmlFor={`path-${id}`}>
            Dot path (empty = full document; e.g. user.name or items.0.id)
          </label>
          <input
            className="w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            id={`path-${id}`}
            value={d.path}
            onChange={(e) => updateNodeData(id, { path: e.target.value })}
          />
        </div>
      ) : (
        <div className="mt-2 space-y-1">
          <label className="block text-xs font-medium text-neutral-600" htmlFor={`tpl-${id}`}>
            Template ({"{{input}}"} for upstream; empty = pass through unchanged)
          </label>
          <textarea
            className="mt-0.5 w-full resize-y rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            id={`tpl-${id}`}
            rows={3}
            value={d.template}
            onChange={(e) => updateNodeData(id, { template: e.target.value })}
          />
        </div>
      )}

      <div className="mt-2 rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-700">
        <div className="font-medium text-neutral-600">Preview</div>
        <div className="mt-0.5 whitespace-pre-wrap break-words font-mono text-[11px]">{preview}</div>
      </div>

      <Handle
        className="!h-3 !w-3 !border-2 !border-white !bg-cyan-600"
        position={Position.Top}
        type="target"
      />
      <Handle
        className="!h-3 !w-3 !border-2 !border-white !bg-cyan-600"
        position={Position.Bottom}
        type="source"
      />
    </div>
  );
}
