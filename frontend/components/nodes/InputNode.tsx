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
import type { FlowNode, InputNodeData } from "@/types/pipeline";

export function InputNode({ id, data, selected }: NodeProps<FlowNode>) {
  const d = data as InputNodeData;
  const updateNodeData = usePipelineStore((s) => s.updateNodeData);
  const nodeStatus = useExecutionStore((s) => s.nodeStatuses[id]);

  return (
    <div
      className={`relative min-w-[220px] rounded-lg border-2 border-blue-500 bg-white px-3 py-2 pl-7 pr-7 text-sm text-neutral-800 shadow-sm ${nodeExecutionRingClass(nodeStatus)} ${nodeSkippedCardClass(nodeStatus)} ${nodeDebugInspectClass(selected)}`}
      data-testid={`node-input-${id}`}
    >
      <NodeStatusBadge status={nodeStatus} />
      <NodeValidationBadge nodeId={id} />
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-blue-700">
        Input
      </div>
      <label className="block text-xs font-medium text-neutral-600" htmlFor={`input-${id}`}>
        Your Input
      </label>
      <textarea
        className="mt-1 w-full resize-y rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        id={`input-${id}`}
        rows={4}
        value={d.value}
        onChange={(e) => updateNodeData(id, { value: e.target.value })}
      />
      <Handle
        className="!h-3 !w-3 !border-2 !border-white !bg-blue-500"
        position={Position.Bottom}
        type="source"
      />
    </div>
  );
}
