"use client";

import { useEffect, useRef, type ChangeEventHandler } from "react";

import { getOllamaModels } from "@/lib/api";
import { runPipeline } from "@/lib/sseClient";
import { loadPipelineFile, savePipeline } from "@/lib/pipelineFile";
import { useExecutionStore, type NodeRunStatus } from "@/store/executionStore";
import { usePipelineStore } from "@/store/pipelineStore";
import { useValidationStore } from "@/store/validationStore";
import { toGraphPayload } from "@/types/pipeline";

function mapBackendStatus(status: string): NodeRunStatus {
  if (
    status === "pending" ||
    status === "running" ||
    status === "done" ||
    status === "error" ||
    status === "skipped"
  ) {
    return status;
  }
  return "pending";
}

export function TopBar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const status = useExecutionStore((s) => s.status);
  const loadPipeline = usePipelineStore((s) => s.loadPipeline);
  const ollamaOnline = useValidationStore((s) => s.ollamaOnline);
  const graphValid = useValidationStore((s) => s.graphValid);

  const canRun = status !== "running" && graphValid && ollamaOnline;

  useEffect(() => {
    void getOllamaModels().then((r) => useExecutionStore.getState().setOllamaModels(r.models));
  }, []);

  const handleRun = async () => {
    const graph = toGraphPayload(
      usePipelineStore.getState().nodes,
      usePipelineStore.getState().edges,
    );
    useExecutionStore.getState().startRun(graph.nodes.map((n) => n.id));
    await runPipeline(graph, {
      onToken: (id, token) => {
        const st = useExecutionStore.getState();
        st.appendToken(id, token);
        st.updateNodeStatus(id, "running");
      },
      onNodeStatus: (id, st, payload) => {
        useExecutionStore.getState().updateNodeStatus(id, mapBackendStatus(st));
        if (st === "done") {
          const v = payload.value;
          const inp = payload.input;
          if (typeof v === "string" || typeof inp === "string") {
            useExecutionStore.getState().setNodeRunArtifact(id, {
              ...(typeof v === "string" ? { value: v } : {}),
              ...(typeof inp === "string" ? { input: inp } : {}),
            });
          }
          if (typeof v === "string") {
            useExecutionStore.setState((s) => ({
              streamingOutput: { ...s.streamingOutput, [id]: v },
            }));
          }
          const node = usePipelineStore.getState().nodes.find((n) => n.id === id);
          if (node?.type === "output") {
            usePipelineStore.getState().updateNodeData(id, {
              lastRunAt: new Date().toISOString(),
            });
          }
        }
      },
      onError: (msg, nodeId) => useExecutionStore.getState().setError(msg, nodeId),
      onDone: () => useExecutionStore.getState().finishRun(),
    });
  };

  const handleSave = () => {
    const s = usePipelineStore.getState();
    savePipeline(s.nodes, s.edges, s.viewport);
  };

  const pickFile = () => fileInputRef.current?.click();

  const onFileChange: ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const doc = await loadPipelineFile(file);
      loadPipeline(doc);
    } catch (err) {
      console.error(err);
      window.alert(err instanceof Error ? err.message : "Could not load file.");
    }
  };

  return (
    <header
      className="flex shrink-0 flex-col"
      style={{ background: "var(--panel-bg)", borderBottom: "1px solid var(--panel-accent-border)" }}
    >
      <div className="flex h-11 items-center gap-4 px-4">
        {/* Logo */}
        <span
          className="select-none"
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 12,
            letterSpacing: "0.08em",
            color: "var(--panel-text)",
          }}
        >
          <span style={{ color: "var(--panel-accent)" }}>⬡</span>
          {" LlamaGraph"}
        </span>

        {/* Divider */}
        <span style={{ width: 1, height: 16, background: "var(--panel-border)", flexShrink: 0 }} />

        {/* Status */}
        <div className="flex items-center gap-2">
          <span
            className={status === "running" ? "flowai-running-ring" : ""}
            style={{
              display: "inline-block",
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: status === "running" ? "var(--panel-accent)" : "#252525",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 10,
              letterSpacing: "0.08em",
              color: status === "running" ? "var(--panel-accent)" : "var(--panel-text-muted)",
            }}
          >
            {status === "running" ? "running" : "idle"}
          </span>
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            disabled={!canRun}
            className="panel-btn panel-btn-accent"
            onClick={() => void handleRun()}
          >
            {status === "running" ? "// running" : "▶ run"}
          </button>
          <button
            type="button"
            className="panel-btn panel-btn-ghost"
            onClick={handleSave}
          >
            save
          </button>
          <button
            type="button"
            className="panel-btn panel-btn-ghost"
            onClick={pickFile}
          >
            load
          </button>
          <input
            ref={fileInputRef}
            accept=".json,application/json,.llamagraph.json"
            className="hidden"
            type="file"
            onChange={onFileChange}
          />
        </div>
      </div>
    </header>
  );
}
