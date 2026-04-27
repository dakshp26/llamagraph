"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useCallback, useState } from "react";

import { NodeStatusBadge } from "@/components/ui/NodeStatusBadge";
import { NodeValidationBadge } from "@/components/ui/NodeValidationBadge";
import {
  nodeDebugInspectClass,
  nodeExecutionRingClass,
  nodeSkippedCardClass,
} from "@/lib/nodeExecutionChrome";
import { useExecutionStore } from "@/store/executionStore";
import type { FlowNode, OutputNodeData } from "@/types/pipeline";

function formatLastRun(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function OutputNode({ id, data, selected }: NodeProps<FlowNode>) {
  const d = data as OutputNodeData;
  const streamingText = useExecutionStore((s) => s.streamingOutput[id] ?? "");
  const nodeStatus = useExecutionStore((s) => s.nodeStatuses[id]);
  const [copied, setCopied] = useState(false);

  const display = streamingText || "Waiting for output…";
  const canCopy = streamingText.length > 0;

  const onCopy = useCallback(async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(streamingText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [canCopy, streamingText]);

  return (
    <div
      className={`relative min-w-[220px] rounded-lg border-2 border-emerald-600 bg-white px-3 py-2 pl-7 pr-7 text-sm text-neutral-800 shadow-sm ${nodeExecutionRingClass(nodeStatus)} ${nodeSkippedCardClass(nodeStatus)} ${nodeDebugInspectClass(selected)}`}
      data-testid={`node-output-${id}`}
    >
      <NodeStatusBadge status={nodeStatus} />
      <NodeValidationBadge nodeId={id} />
      <Handle
        className="!h-3 !w-3 !border-2 !border-white !bg-emerald-600"
        position={Position.Top}
        type="target"
      />
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-800">
        Output
      </div>
      <textarea
        readOnly
        className="w-full resize-y rounded border border-neutral-300 bg-neutral-50 px-2 py-1.5 text-sm text-neutral-800"
        rows={5}
        value={display}
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={!canCopy}
          className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-neutral-50"
          onClick={() => void onCopy()}
        >
          {copied ? "Copied" : "Copy to clipboard"}
        </button>
      </div>
      <div className="mt-1 text-[11px] text-neutral-500">
        Last run: {formatLastRun(d.lastRunAt)}
      </div>
    </div>
  );
}
