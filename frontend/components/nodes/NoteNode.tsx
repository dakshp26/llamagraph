"use client";

import { type NodeProps } from "@xyflow/react";

import { usePipelineStore } from "@/store/pipelineStore";
import type { FlowNode, NoteNodeData } from "@/types/pipeline";

export function NoteNode({ id, data }: NodeProps<FlowNode>) {
  const d = data as NoteNodeData;
  const updateNodeData = usePipelineStore((s) => s.updateNodeData);

  return (
    <div className="min-w-[200px] max-w-[320px] rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 shadow-sm">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-yellow-600">
        Note
      </div>
      <textarea
        className="w-full resize-y rounded border border-yellow-200 bg-yellow-50 px-2 py-1.5 text-sm text-neutral-700 outline-none placeholder:text-yellow-400 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-300"
        placeholder="Add a note…"
        rows={3}
        value={d.text}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
      />
    </div>
  );
}
