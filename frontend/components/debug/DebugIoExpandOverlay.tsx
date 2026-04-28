"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";

import { deriveOutputText, type NodeIoExecutionSlice } from "@/lib/debugNodeIo";
import { nodeColor } from "@/lib/nodeConfig";
import { useExecutionStore, type NodeRunArtifact } from "@/store/executionStore";
import type { FlowNode } from "@/types/pipeline";

import { NodeParamsEditor } from "./NodeIoPane";

function ExpandOutputColumn({
  node,
  ex,
  artifact,
}: {
  node: FlowNode;
  ex: NodeIoExecutionSlice;
  artifact: NodeRunArtifact | undefined;
}) {
  const backend = {
    value: artifact?.value,
    input: artifact?.input,
  };
  const out = deriveOutputText(node.id, node.type, ex, backend);
  const [mode, setMode] = useState<"preview" | "raw">("preview");

  if (out.display === "error") {
    return (
      <div className="flex min-h-0 flex-1 flex-col" style={{ gap: 6 }}>
        <div className="panel-rule">output</div>
        <div className="io-block debug-io-expand-out">
          <span
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 11,
              color: "#e05050",
            }}
          >
            {"// error: "}
            {out.errorMessage ?? "unknown"}
          </span>
        </div>
      </div>
    );
  }

  if (out.display === "skipped") {
    return (
      <div className="flex min-h-0 flex-1 flex-col" style={{ gap: 6 }}>
        <div className="panel-rule">output</div>
        <div className="io-block debug-io-expand-out">
          <span
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 11,
              color: "var(--panel-text-muted)",
            }}
          >
            {"// skipped (condition branch)"}
          </span>
        </div>
      </div>
    );
  }

  const raw = out.text || "—";

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ gap: 6 }}>
      <div className="flex min-h-0 flex-1 flex-col" style={{ gap: 6 }}>
        <div className="flex shrink-0 items-center justify-between gap-2">
          <div className="panel-rule" style={{ marginBottom: 0, flex: 1 }}>
            output
          </div>
          <div className="flex shrink-0 gap-1" role="tablist" aria-label="Output view mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "preview"}
              className={`debug-io-expand-tab${mode === "preview" ? " active" : ""}`}
              onClick={() => setMode("preview")}
            >
              preview
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "raw"}
              className={`debug-io-expand-tab${mode === "raw" ? " active" : ""}`}
              onClick={() => setMode("raw")}
            >
              raw
            </button>
          </div>
        </div>
        <div className="io-block debug-io-expand-out flex min-h-0 flex-1 flex-col overflow-auto">
          {mode === "raw" ? (
            <pre
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 11,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
                color: raw === "—" ? "var(--panel-text-muted)" : "var(--panel-text)",
              }}
            >
              {raw}
            </pre>
          ) : (
            <div className="debug-md-preview">
              <ReactMarkdown>{raw}</ReactMarkdown>
            </div>
          )}
        </div>
        {out.partialNote ? (
          <p
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 9,
              color: "var(--panel-text-muted)",
              flexShrink: 0,
              letterSpacing: "0.04em",
              margin: 0,
            }}
          >
            {out.partialNote}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function DebugIoExpandOverlay({
  open,
  onClose,
  node,
  artifact,
  dialogId,
}: {
  open: boolean;
  onClose: () => void;
  node: FlowNode | null;
  artifact: NodeRunArtifact | undefined;
  dialogId?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open) {
      if (!d.open) d.showModal();
    } else if (d.open) {
      d.close();
    }
  }, [open]);

  const status = useExecutionStore((s) => s.status);
  const runIdle = useExecutionStore((s) => s.status !== "running");
  const nodeStatuses = useExecutionStore((s) => s.nodeStatuses);
  const streamingOutput = useExecutionStore((s) => s.streamingOutput);
  const errors = useExecutionStore((s) => s.errors);

  const ex: NodeIoExecutionSlice = {
    nodeStatuses,
    streamingOutput,
    errors,
    runIdle,
  };

  const typeColor = node ? nodeColor(node.type) : undefined;

  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      id={dialogId}
      className="debug-io-expand-dialog"
      onClose={onClose}
      onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{
          maxHeight: "min(92dvh, 880px)",
          width: "min(96vw, 1080px)",
        }}
      >
        <header
          className="flex shrink-0 items-center justify-between gap-3 border-b"
          style={{
            borderColor: "var(--panel-border)",
            padding: "12px 14px 10px 16px",
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 3,
                height: 16,
                borderRadius: 1,
                background: typeColor ?? "var(--panel-border)",
                flexShrink: 0,
              }}
            />
            {node ? (
              <span
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: 10,
                  color: "var(--panel-text-muted)",
                  letterSpacing: "0.04em",
                }}
              >
                {node.type} · {node.id.slice(0, 8)}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {status === "running" ? (
              <span
                className="flowai-running-ring"
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: 9,
                  color: "var(--panel-accent)",
                  letterSpacing: "0.04em",
                }}
              >
                ● exec
              </span>
            ) : null}
            <button type="button" className="panel-btn panel-btn-ghost" onClick={onClose}>
              close
            </button>
          </div>
        </header>

        <div
          className="debug-io-expand-body grid min-h-0 flex-1 overflow-hidden"
          style={{
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 0,
          }}
        >
          {/* Inputs */}
          <div
            className="flex min-h-0 min-w-0 flex-col overflow-auto border-r"
            style={{
              borderColor: "var(--panel-border)",
              padding: "14px 16px",
              gap: 8,
            }}
          >
            <div className="panel-rule">inputs</div>
            {node ? (
              <div className="min-h-0 flex-1">
                <NodeParamsEditor node={node} inputIdSuffix="-expand" />
              </div>
            ) : (
              <p
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: 10,
                  color: "var(--panel-text-muted)",
                  letterSpacing: "0.04em",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {"// select a node to inspect i/o"}
              </p>
            )}
          </div>

          {/* Output */}
          <div
            className="flex min-h-0 min-w-0 flex-col overflow-auto"
            style={{ padding: "14px 16px", gap: 8 }}
          >
            {node ? (
              <ExpandOutputColumn node={node} ex={ex} artifact={artifact} />
            ) : (
              <>
                <div className="panel-rule">output</div>
                <div className="io-block debug-io-expand-out">
                  <p
                    style={{
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: 10,
                      color: "var(--panel-text-muted)",
                      letterSpacing: "0.04em",
                      margin: 0,
                    }}
                  >
                    {"// select a node to inspect i/o"}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
