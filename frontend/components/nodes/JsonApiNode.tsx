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
import { useNodePreview } from "@/lib/nodePreview";
import { useExecutionStore } from "@/store/executionStore";
import { usePipelineStore } from "@/store/pipelineStore";
import type { FlowNode, JsonApiNodeData, JsonApiParam } from "@/types/pipeline";

export function JsonApiNode({ id, data, selected }: NodeProps<FlowNode>) {
  const d = data as JsonApiNodeData;
  const updateNodeData = usePipelineStore((s) => s.updateNodeData);
  const updateNodeInternals = useUpdateNodeInternals();
  const nodeStatus = useExecutionStore((s) => s.nodeStatuses[id]);
  const preview = useNodePreview(id, "json_api", d);

  const allText =
    d.url +
    d.params.map((p) => p.value).join("") +
    d.headers.map((h) => h.value).join("");
  const placeholders = extractPromptPlaceholders(allText);
  const hasPlaceholders = placeholders.length > 0;
  const placeholderSignature = placeholders.join("");

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, placeholderSignature, updateNodeInternals]);

  function updateParam(index: number, field: keyof JsonApiParam, value: string) {
    const next = d.params.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    updateNodeData(id, { params: next });
  }

  function addParam() {
    updateNodeData(id, { params: [...d.params, { key: "", value: "" }] });
  }

  function removeParam(index: number) {
    updateNodeData(id, { params: d.params.filter((_, i) => i !== index) });
  }

  function updateHeader(index: number, field: keyof JsonApiParam, value: string) {
    const next = d.headers.map((h, i) => (i === index ? { ...h, [field]: value } : h));
    updateNodeData(id, { headers: next });
  }

  function addHeader() {
    updateNodeData(id, { headers: [...d.headers, { key: "", value: "" }] });
  }

  function removeHeader(index: number) {
    updateNodeData(id, { headers: d.headers.filter((_, i) => i !== index) });
  }

  return (
    <div
      className={`relative min-w-[280px] max-w-[320px] rounded-lg border-2 border-orange-500 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm ${hasPlaceholders ? "pt-6" : ""} ${nodeExecutionRingClass(nodeStatus)} ${nodeSkippedCardClass(nodeStatus)} ${nodeDebugInspectClass(selected)}`}
      data-testid={`node-json_api-${id}`}
    >
      <NodeStatusBadge status={nodeStatus} />
      <NodeValidationBadge nodeId={id} />

      {hasPlaceholders &&
        placeholders.map((name, i) => {
          const left = `${((i + 1) / (placeholders.length + 1)) * 100}%`;
          return (
            <Fragment key={name}>
              <Handle
                className="!h-3 !w-3 !border-2 !border-white !bg-orange-500"
                id={name}
                position={Position.Top}
                style={{ left }}
                type="target"
              />
              <span
                className="pointer-events-none absolute z-0 max-w-[5.5rem] -translate-x-1/2 truncate text-center font-mono text-[10px] leading-tight text-orange-800"
                style={{ left, top: 12 }}
              >
                {name}
              </span>
            </Fragment>
          );
        })}

      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-orange-800">
        JSON API
      </div>

      <label className="block text-xs font-medium text-neutral-600" htmlFor={`json-api-url-${id}`}>
        URL
      </label>
      <textarea
        className="mt-1 w-full resize-y rounded border border-neutral-300 bg-white px-2 py-1.5 font-mono text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
        id={`json-api-url-${id}`}
        placeholder="https://api.example.com/endpoint"
        rows={2}
        value={d.url}
        onChange={(e) => updateNodeData(id, { url: e.target.value })}
      />

      <div className="mt-2">
        <div className="mb-1 text-xs font-medium text-neutral-600">Query Params</div>
        {d.params.map((p, i) => (
          <div key={i} className="mb-1 flex items-center gap-1">
            <input
              className="w-[35%] rounded border border-neutral-300 px-1.5 py-1 font-mono text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              placeholder="key"
              value={p.key}
              onChange={(e) => updateParam(i, "key", e.target.value)}
            />
            <input
              className="w-[55%] rounded border border-neutral-300 px-1.5 py-1 font-mono text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              placeholder="value"
              value={p.value}
              onChange={(e) => updateParam(i, "value", e.target.value)}
            />
            <button
              className="shrink-0 rounded px-1 py-0.5 text-xs text-neutral-400 hover:text-red-500"
              onClick={() => removeParam(i)}
            >
              ×
            </button>
          </div>
        ))}
        <button
          className="mt-0.5 rounded px-2 py-0.5 text-xs text-orange-600 hover:bg-orange-50"
          onClick={addParam}
        >
          + Add param
        </button>
      </div>

      <details className="mt-2">
        <summary className="flex cursor-pointer select-none list-none items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-800 [&::-webkit-details-marker]:hidden">
          <span className="details-arrow transition-transform duration-150">▶</span>
          Headers
        </summary>
        <div className="mt-1">
          {d.headers.map((h, i) => (
            <div key={i} className="mb-1 flex items-center gap-1">
              <input
                className="w-[35%] rounded border border-neutral-300 px-1.5 py-1 font-mono text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                placeholder="key"
                value={h.key}
                onChange={(e) => updateHeader(i, "key", e.target.value)}
              />
              <input
                className="w-[55%] rounded border border-neutral-300 px-1.5 py-1 font-mono text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                placeholder="value"
                value={h.value}
                onChange={(e) => updateHeader(i, "value", e.target.value)}
              />
              <button
                className="shrink-0 rounded px-1 py-0.5 text-xs text-neutral-400 hover:text-red-500"
                onClick={() => removeHeader(i)}
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="mt-0.5 rounded px-2 py-0.5 text-xs text-orange-600 hover:bg-orange-50"
            onClick={addHeader}
          >
            + Add header
          </button>
        </div>
      </details>

      {preview && (
        <div className="mt-2 border-t border-neutral-100 pt-2">
          <div className="mb-0.5 text-[11px] font-medium text-neutral-500">Preview</div>
          <pre className="whitespace-pre-wrap rounded bg-neutral-50 px-2 py-1.5 font-mono text-[11px] text-neutral-700">
            {preview}
          </pre>
        </div>
      )}

      <Handle
        className="!h-3 !w-3 !border-2 !border-white !bg-orange-500"
        position={Position.Bottom}
        type="source"
      />
    </div>
  );
}
