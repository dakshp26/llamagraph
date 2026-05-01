"use client";

import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import {
  type NodeIoExecutionSlice,
  deriveOutputText,
} from "@/lib/debugNodeIo";
import { useNodePreview } from "@/lib/nodePreview";
import { makeJsonApiParamHandlers } from "@/lib/jsonApiParams";
import type {
  FlowNode,
  InputNodeData,
  JsonApiNodeData,
  NoteNodeData,
  PromptNodeData,
  TransformNodeData,
  ConditionNodeData,
  LLMNodeData,
} from "@/types/pipeline";
import { nodeColor } from "@/lib/nodeConfig";
import { useExecutionStore, type NodeRunArtifact } from "@/store/executionStore";
import { usePipelineStore } from "@/store/pipelineStore";

const PREVIEW_TIP =
  "Preview is based on the most recent pipeline run. Changes to upstream nodes are not reflected until the pipeline is re-run; only edits to this node take effect immediately.";

export const OUTPUT_TIP =
  "Output reflects the most recent pipeline run. Changes to upstream nodes take effect only after re-running the pipeline; only edits to this node are applied immediately.";

export function InfoTip({ message }: { message: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const iconRef = useRef<HTMLSpanElement>(null);

  return (
    <span
      style={{ display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setRect(iconRef.current?.getBoundingClientRect() ?? null)}
      onMouseLeave={() => setRect(null)}
    >
      <span
        ref={iconRef}
        aria-label={message}
        style={{
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: 9,
          color: "var(--panel-text-muted)",
          cursor: "default",
          userSelect: "none",
          lineHeight: 1,
          opacity: 0.55,
        }}
      >
        ⓘ
      </span>
      {rect && (
        <span
          role="tooltip"
          style={{
            position: "fixed",
            // show below if more viewport space below than above, otherwise above
            ...(rect.top > window.innerHeight - rect.bottom
              ? { bottom: window.innerHeight - rect.top + 5 }
              : { top: rect.bottom + 5 }),
            left: Math.min(rect.left, window.innerWidth - 252),
            background: "var(--panel-bg)",
            border: "1px solid var(--panel-border)",
            borderRadius: 4,
            padding: "5px 8px",
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 9,
            color: "var(--panel-text-muted)",
            letterSpacing: "0.04em",
            lineHeight: 1.6,
            width: 240,
            zIndex: 9999,
            pointerEvents: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}
        >
          {message}
        </span>
      )}
    </span>
  );
}

function IoBlock({
  label,
  children,
  helper,
  tip,
}: {
  label: string;
  children: ReactNode;
  helper?: string | null;
  tip?: string;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col" style={{ gap: 5 }}>
      <div className="panel-rule" style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span>{label}</span>
        {tip ? <InfoTip message={tip} /> : null}
      </div>
      <div className="io-block">
        {children}
      </div>
      {helper ? (
        <p
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 9,
            color: "var(--panel-text-muted)",
            flexShrink: 0,
            letterSpacing: "0.04em",
          }}
        >
          {helper}
        </p>
      ) : null}
    </div>
  );
}

const inputStyle: CSSProperties = {
  fontFamily: "var(--font-geist-mono), monospace",
  fontSize: 11,
  background: "var(--panel-bg)",
  border: "1px solid var(--panel-border)",
  borderRadius: 3,
  color: "var(--panel-text)",
  padding: "3px 6px",
  width: "100%",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-geist-mono), monospace",
  fontSize: 9,
  color: "var(--panel-text-muted)",
  letterSpacing: "0.06em",
  display: "block",
  marginBottom: 2,
  marginTop: 6,
};

/** Debug panel node parameter fields. Pass `inputIdSuffix` when another copy mounts (e.g. expand overlay) to keep ids unique. */
export function NodeParamsEditor({
  node,
  inputIdSuffix = "",
}: {
  node: FlowNode;
  /** Appended to form control ids (e.g. `-expand`) */
  inputIdSuffix?: string;
}) {
  const updateNodeData = usePipelineStore((s) => s.updateNodeData);
  const ollamaModels = useExecutionStore((s) => s.ollamaModels);
  const { id, type, data } = node;
  const preview = useNodePreview(id, type, data);
  const sid = `${id}${inputIdSuffix}`;

  if (type === "input") {
    const d = data as InputNodeData;
    return (
      <div>
        <label style={labelStyle} htmlFor={`dbg-input-value-${sid}`}>value</label>
        <textarea
          id={`dbg-input-value-${sid}`}
          rows={4}
          style={{ ...inputStyle, resize: "vertical" }}
          value={d.value}
          onChange={(e) => updateNodeData(id, { value: e.target.value })}
        />
      </div>
    );
  }

  if (type === "prompt") {
    const d = data as PromptNodeData;
    return (
      <div>
        <label style={labelStyle} htmlFor={`dbg-prompt-tpl-${sid}`}>template</label>
        <textarea
          id={`dbg-prompt-tpl-${sid}`}
          rows={5}
          style={{ ...inputStyle, resize: "vertical" }}
          value={d.template}
          onChange={(e) => updateNodeData(id, { template: e.target.value })}
        />
        <div style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 4 }}>
          <span>preview</span>
          <InfoTip message={PREVIEW_TIP} />
        </div>
        <pre
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 11,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "var(--panel-bg)",
            border: "1px solid var(--panel-border)",
            borderRadius: 3,
            color: preview ? "var(--panel-text)" : "var(--panel-text-muted)",
            fontStyle: preview ? "normal" : "italic",
            padding: "3px 6px",
            margin: 0,
          }}
        >
          {preview || "Run prior nodes to see the resolved prompt."}
        </pre>
      </div>
    );
  }

  if (type === "transform") {
    const d = data as TransformNodeData;
    return (
      <div>
        <label style={labelStyle}>mode</label>
        <select
          style={inputStyle}
          value={d.mode}
          onChange={(e) => updateNodeData(id, { mode: e.target.value })}
        >
          <option value="extract">extract</option>
          <option value="template">template</option>
        </select>
        {d.mode === "extract" ? (
          <>
            <label style={labelStyle} htmlFor={`dbg-tf-path-${sid}`}>dot path</label>
            <input
              id={`dbg-tf-path-${sid}`}
              style={inputStyle}
              value={d.path}
              onChange={(e) => updateNodeData(id, { path: e.target.value })}
            />
          </>
        ) : (
          <>
            <label style={labelStyle} htmlFor={`dbg-tf-tpl-${sid}`}>template</label>
            <textarea
              id={`dbg-tf-tpl-${sid}`}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              value={d.template}
              onChange={(e) => updateNodeData(id, { template: e.target.value })}
            />
          </>
        )}
        {preview && (
          <>
            <div style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 4 }}>
              <span>preview</span>
              <InfoTip message={PREVIEW_TIP} />
            </div>
            <pre
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 11,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "var(--panel-bg)",
                border: "1px solid var(--panel-border)",
                borderRadius: 3,
                color: "var(--panel-text)",
                padding: "3px 6px",
                margin: 0,
              }}
            >
              {preview}
            </pre>
          </>
        )}
      </div>
    );
  }

  if (type === "condition") {
    const d = data as ConditionNodeData;
    return (
      <div>
        <label style={labelStyle} htmlFor={`dbg-cond-pat-${sid}`}>pattern</label>
        <input
          id={`dbg-cond-pat-${sid}`}
          style={inputStyle}
          value={d.pattern}
          onChange={(e) => updateNodeData(id, { pattern: e.target.value })}
        />
      </div>
    );
  }

  if (type === "llm") {
    const d = data as LLMNodeData;
    const modelOptions =
      d.model && !ollamaModels.includes(d.model) ? [d.model, ...ollamaModels] : ollamaModels;
    return (
      <div>
        <label style={labelStyle} htmlFor={`dbg-llm-model-${sid}`}>model</label>
        <select
          id={`dbg-llm-model-${sid}`}
          style={inputStyle}
          value={d.model}
          onChange={(e) => updateNodeData(id, { model: e.target.value })}
        >
          {modelOptions.length === 0 ? (
            <option value={d.model}>{d.model || "no models — start ollama"}</option>
          ) : (
            modelOptions.map((m) => <option key={m} value={m}>{m}</option>)
          )}
        </select>

        <label style={labelStyle} htmlFor={`dbg-llm-temp-${sid}`}>
          temperature — {d.temperature.toFixed(1)}
        </label>
        <input
          id={`dbg-llm-temp-${sid}`}
          type="range"
          min={0}
          max={1}
          step={0.1}
          style={{ width: "100%", accentColor: "var(--panel-accent)" }}
          value={d.temperature}
          onChange={(e) => updateNodeData(id, { temperature: Number(e.target.value) })}
        />

        <label style={labelStyle} htmlFor={`dbg-llm-sys-${sid}`}>system prompt</label>
        <textarea
          id={`dbg-llm-sys-${sid}`}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          value={d.systemPrompt}
          onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
        />
      </div>
    );
  }

  if (type === "json_api") {
    const d = data as JsonApiNodeData;
    const { updateParam, addParam, removeParam, updateHeader, addHeader, removeHeader } =
      makeJsonApiParamHandlers(id, d, updateNodeData);

    return (
      <div>
        <label style={labelStyle} htmlFor={`dbg-japi-url-${sid}`}>url</label>
        <textarea
          id={`dbg-japi-url-${sid}`}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
          value={d.url}
          onChange={(e) => updateNodeData(id, { url: e.target.value })}
        />

        <label style={labelStyle}>query params</label>
        {d.params.map((p, i) => (
          <div key={p.id ?? i} style={{ display: "flex", gap: 3, marginBottom: 3 }}>
            <input
              style={{ ...inputStyle, width: "35%" }}
              placeholder="key"
              value={p.key}
              onChange={(e) => updateParam(i, "key", e.target.value)}
            />
            <input
              style={{ ...inputStyle, width: "55%" }}
              placeholder="value"
              value={p.value}
              onChange={(e) => updateParam(i, "value", e.target.value)}
            />
            <button
              style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: "var(--panel-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "0 2px" }}
              onClick={() => removeParam(i)}
            >
              ×
            </button>
          </div>
        ))}
        <button
          style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 9, color: "var(--panel-accent)", background: "none", border: "none", cursor: "pointer", padding: "2px 0", letterSpacing: "0.04em" }}
          onClick={addParam}
        >
          + add param
        </button>

        <details>
          <summary style={{ ...labelStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, listStyle: "none" }}>
            <span style={{ fontSize: 7, display: "inline-block", transition: "transform 0.15s" }} className="details-arrow">▶</span>
            headers
          </summary>
          {d.headers.map((h, i) => (
            <div key={h.id ?? i} style={{ display: "flex", gap: 3, marginBottom: 3 }}>
              <input
                style={{ ...inputStyle, width: "35%" }}
                placeholder="key"
                value={h.key}
                onChange={(e) => updateHeader(i, "key", e.target.value)}
              />
              <input
                style={{ ...inputStyle, width: "55%" }}
                placeholder="value"
                value={h.value}
                onChange={(e) => updateHeader(i, "value", e.target.value)}
              />
              <button
                style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: "var(--panel-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "0 2px" }}
                onClick={() => removeHeader(i)}
              >
                ×
              </button>
            </div>
          ))}
          <button
            style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 9, color: "var(--panel-accent)", background: "none", border: "none", cursor: "pointer", padding: "2px 0", letterSpacing: "0.04em" }}
            onClick={addHeader}
          >
            + add header
          </button>
        </details>

        {preview && (
          <>
            <div style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
              <span>curl preview</span>
              <InfoTip message={PREVIEW_TIP} />
            </div>
            <pre
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 11,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "var(--panel-bg)",
                border: "1px solid var(--panel-border)",
                borderRadius: 3,
                color: "var(--panel-text)",
                padding: "3px 6px",
                margin: 0,
              }}
            >
              {preview}
            </pre>
          </>
        )}
      </div>
    );
  }

  if (type === "note") {
    const d = data as NoteNodeData;
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <label style={labelStyle} htmlFor={`dbg-note-text-${sid}`}>text</label>
        <textarea
          id={`dbg-note-text-${sid}`}
          style={{ ...inputStyle, resize: "vertical", minHeight: 120, flex: 1 }}
          placeholder="Add a note…"
          value={d.text}
          onChange={(e) => updateNodeData(id, { text: e.target.value })}
        />
      </div>
    );
  }

  return (
    <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "var(--panel-text-muted)" }}>
      —
    </span>
  );
}

function NodeHeader({ node, typeColor, status }: { node: FlowNode; typeColor: string; status?: string }) {
  return (
    <div className="flex items-center shrink-0" style={{ gap: 8 }}>
      <span style={{ display: "inline-block", width: 2, height: 14, borderRadius: 1, background: typeColor, flexShrink: 0 }} />
      <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "var(--panel-text)", letterSpacing: "0.04em" }}>
        {node.type}
      </span>
      <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 9, color: "var(--panel-text-muted)", letterSpacing: "0.06em" }}>
        {node.id.slice(0, 8)}
      </span>
      {status === "running" ? (
        <span className="flowai-running-ring" style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 9, color: "var(--panel-accent)", letterSpacing: "0.04em", marginLeft: "auto" }}>
          ● exec
        </span>
      ) : null}
    </div>
  );
}

export function NodeIoPane({
  node,
  artifact,
}: {
  node: FlowNode | null;
  artifact: NodeRunArtifact | undefined;
}) {
  const status = useExecutionStore((s) => s.status);
  const runIdle = useExecutionStore((s) => s.status !== "running");
  const nodeStatuses = useExecutionStore((s) => s.nodeStatuses);
  const streamingOutput = useExecutionStore((s) => s.streamingOutput);
  const errors = useExecutionStore((s) => s.errors);
  const updateNodeData = usePipelineStore((s) => s.updateNodeData);

  if (!node) {
    return (
      <p
        style={{
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: 10,
          color: "var(--panel-text-muted)",
          letterSpacing: "0.04em",
          lineHeight: 1.6,
        }}
      >
        {"// select a node to inspect i/o"}
      </p>
    );
  }

  const ex: NodeIoExecutionSlice = {
    nodeStatuses,
    streamingOutput,
    errors,
    runIdle,
  };
  const backend = {
    value: artifact?.value,
    input: artifact?.input,
  };
  const typeColor = nodeColor(node.type);

  if (node.type === "note") {
    const d = node.data as NoteNodeData;
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col" style={{ gap: 10 }}>
        <NodeHeader node={node} typeColor={typeColor} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col" style={{ gap: 5 }}>
          <div className="panel-rule">note text</div>
          <div className="io-block" style={{ flex: 1, display: "flex" }}>
            <textarea
              style={{ ...inputStyle, resize: "none", flex: 1, minHeight: 60 }}
              placeholder="Add a note…"
              value={d.text}
              onChange={(e) => updateNodeData(node.id, { text: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  }

  const out = deriveOutputText(node.id, node.type, ex, backend);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col" style={{ gap: 10 }}>
      <NodeHeader node={node} typeColor={typeColor} status={status} />

      {/* IO blocks */}
      <div
        className="min-h-0 min-w-0 flex-1"
        style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 10 }}
      >
        <IoBlock label="inputs">
          <NodeParamsEditor node={node} />
        </IoBlock>

        <IoBlock label="output" helper={out.partialNote} tip={OUTPUT_TIP}>
          {out.display === "error" ? (
            <span
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 11,
                color: "#e05050",
              }}
            >
              {"// error: "}{out.errorMessage ?? "unknown"}
            </span>
          ) : out.display === "skipped" ? (
            <span
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 11,
                color: "var(--panel-text-muted)",
              }}
            >
              {"// skipped (condition branch)"}
            </span>
          ) : (
            <pre
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 11,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
                color: out.text ? "var(--panel-text)" : "var(--panel-text-muted)",
              }}
            >
              {out.text || "—"}
            </pre>
          )}
        </IoBlock>
      </div>
    </div>
  );
}
