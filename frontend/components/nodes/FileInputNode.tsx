"use client";

import { useEffect, useState } from "react";
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
import type { FileInputNodeData, FlowNode } from "@/types/pipeline";
import { nodeColor } from "@/lib/nodeConfig";
import { useFileInput } from "@/lib/useFileInput";

const PREVIEW_TRUNCATE = 500;

interface FileInputNodeProps extends NodeProps<FlowNode> {
  accept: string;
  nodeTypeName: string;
}

export function FileInputNode({ id, data, selected, type: nodeType, accept, nodeTypeName }: FileInputNodeProps) {
  const d = data as FileInputNodeData;
  const updateNodeData = usePipelineStore((s) => s.updateNodeData);
  const nodeStatus = useExecutionStore((s) => s.nodeStatuses[id]);

  const [expanded, setExpanded] = useState(false);

  const color = nodeColor(nodeType);

  const {
    availableFiles,
    uploading,
    uploadError,
    previewMarkdown,
    previewLoading,
    fileInputRef,
    fetchPreview,
    handleFileChange,
    triggerUpload,
  } = useFileInput({ accept, nodeId: id });

  useEffect(() => {
    fetchPreview(d.filename ?? "");
  }, [d.filename, fetchPreview]);

  const displayMarkdown = previewMarkdown ?? "";
  const truncated = displayMarkdown.slice(0, PREVIEW_TRUNCATE);
  const isTruncatable = displayMarkdown.length > PREVIEW_TRUNCATE;

  return (
    <div
      className={`relative min-w-[260px] rounded-lg border-2 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm ${nodeExecutionRingClass(nodeStatus)} ${nodeSkippedCardClass(nodeStatus)} ${nodeDebugInspectClass(selected)}`}
      style={{ borderColor: color }}
      data-testid={`node-file-${id}`}
    >
      <NodeStatusBadge status={nodeStatus} />
      <NodeValidationBadge nodeId={id} />

      <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color }}>
        {nodeTypeName}
      </div>

      {/* File selector dropdown */}
      <label className="mb-1 block text-xs font-medium text-neutral-600">File</label>
      <select
        className="w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        value={d.filename ?? ""}
        onChange={(e) => updateNodeData(id, { filename: e.target.value })}
      >
        <option value="">— No file selected —</option>
        {availableFiles.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      {/* Upload button */}
      <button
        className="mt-2 w-full rounded border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50"
        disabled={uploading}
        onClick={triggerUpload}
        type="button"
      >
        {uploading ? "Uploading…" : "Upload file"}
      </button>
      <input
        ref={fileInputRef}
        accept={accept}
        className="hidden"
        type="file"
        onChange={handleFileChange}
      />

      {uploadError && (
        <p className="mt-1 text-xs text-red-600">{uploadError}</p>
      )}

      {/* Markdown preview */}
      {d.filename && (
        <div className="mt-2">
          {previewLoading ? (
            <div className="h-16 animate-pulse rounded bg-neutral-100" />
          ) : previewMarkdown !== null ? (
            <div>
              <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded bg-neutral-50 p-2 text-xs text-neutral-700">
                {expanded ? displayMarkdown : truncated}
                {!expanded && isTruncatable && "…"}
              </pre>
              {isTruncatable && (
                <button
                  className="mt-1 text-xs text-blue-500 underline"
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? "Show less" : "Show full preview"}
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}

      <Handle
        className="!h-3 !w-3 !border-2 !border-white"
        style={{ backgroundColor: color }}
        position={Position.Bottom}
        type="source"
      />
    </div>
  );
}
