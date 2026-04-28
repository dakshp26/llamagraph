"use client";

import type { CSSProperties, ReactNode } from "react";

import {
  type NodeIoExecutionSlice,
  deriveOutputText,
} from "@/lib/debugNodeIo";
import type {
  FlowNode,
  InputNodeData,
  PromptNodeData,
  TransformNodeData,
  ConditionNodeData,
  LLMNodeData,
} from "@/types/pipeline";
import { nodeColor } from "@/lib/nodeConfig";
import { useExecutionStore, type NodeRunArtifact } from "@/store/executionStore";
import { usePipelineStore } from "@/store/pipelineStore";

function IoBlock({
  label,
  children,
  helper,
}: {
  label: string;
  children: ReactNode;
  helper?: string | null;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col" style={{ gap: 5 }}>
      <div className="panel-rule">{label}</div>
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

  return (
    <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "var(--panel-text-muted)" }}>
      —
    </span>
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
  const out = deriveOutputText(node.id, node.type, ex, backend);
  const typeColor = nodeColor(node.type);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col" style={{ gap: 10 }}>
      {/* Node identity */}
      <div
        className="flex items-center shrink-0"
        style={{ gap: 8 }}
      >
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: 14,
            borderRadius: 1,
            background: typeColor,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 11,
            color: "var(--panel-text)",
            letterSpacing: "0.04em",
          }}
        >
          {node.type}
        </span>
        <span
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 9,
            color: "var(--panel-text-muted)",
            letterSpacing: "0.06em",
          }}
        >
          {node.id.slice(0, 8)}
        </span>
        {status === "running" ? (
          <span
            className="flowai-running-ring"
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 9,
              color: "var(--panel-accent)",
              letterSpacing: "0.04em",
              marginLeft: "auto",
            }}
          >
            ● exec
          </span>
        ) : null}
      </div>

      {/* IO blocks */}
      <div
        className="min-h-0 min-w-0 flex-1"
        style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 10 }}
      >
        <IoBlock label="inputs">
          <NodeParamsEditor node={node} />
        </IoBlock>

        <IoBlock label="output" helper={out.partialNote}>
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
