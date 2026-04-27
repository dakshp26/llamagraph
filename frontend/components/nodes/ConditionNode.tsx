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
import type { ConditionNodeData, FlowNode } from "@/types/pipeline";

export function ConditionNode({ id, data, selected }: NodeProps<FlowNode>) {
  const d = data as ConditionNodeData;
  const updateNodeData = usePipelineStore((s) => s.updateNodeData);
  const nodeStatus = useExecutionStore((s) => s.nodeStatuses[id]);

  return (
    <div
      className={`relative min-w-[240px] max-w-[280px] rounded-lg border-2 border-rose-600 bg-white px-3 py-2 pb-6 pl-7 pr-7 text-sm text-neutral-800 shadow-sm ${nodeExecutionRingClass(nodeStatus)} ${nodeSkippedCardClass(nodeStatus)} ${nodeDebugInspectClass(selected)}`}
      data-testid={`node-condition-${id}`}
    >
      <NodeStatusBadge status={nodeStatus} />
      <NodeValidationBadge nodeId={id} />
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-rose-800">
        Condition
      </div>
      <label className="block text-xs font-medium text-neutral-600" htmlFor={`cond-${id}`}>
        If output contains…
      </label>
      <input
        className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
        id={`cond-${id}`}
        placeholder="keyword or /regex/"
        value={d.pattern}
        onChange={(e) => updateNodeData(id, { pattern: e.target.value })}
      />
      <p className="mt-1 text-[11px] text-neutral-500">
        Use a plain keyword (case-insensitive) or a pattern like <span className="font-mono">/^\d+$/</span>
      </p>

      <Handle
        className="!h-3 !w-3 !border-2 !border-white !bg-rose-600"
        position={Position.Top}
        type="target"
      />
      <Handle
        className="!h-3 !w-3 !border-2 !border-white !bg-emerald-500"
        id="yes"
        position={Position.Bottom}
        style={{ left: "35%" }}
        type="source"
      />
      <span className="pointer-events-none absolute bottom-1 left-[28%] text-[10px] font-medium text-emerald-700">
        Yes
      </span>
      <Handle
        className="!h-3 !w-3 !border-2 !border-white !bg-red-500"
        id="no"
        position={Position.Bottom}
        style={{ left: "65%" }}
        type="source"
      />
      <span className="pointer-events-none absolute bottom-1 left-[62%] text-[10px] font-medium text-red-700">
        No
      </span>
    </div>
  );
}
