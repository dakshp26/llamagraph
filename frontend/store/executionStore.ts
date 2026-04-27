import { create } from "zustand";

export type RunStatus = "idle" | "running" | "error";

export type NodeRunStatus =
  | "pending"
  | "running"
  | "done"
  | "error"
  | "skipped";

export interface ExecutionError {
  node_id: string;
  message: string;
}

export interface NodeRunArtifact {
  value?: string;
  input?: string;
}

export interface ExecutionState {
  status: RunStatus;
  nodeStatuses: Record<string, NodeRunStatus>;
  streamingOutput: Record<string, string>;
  /** Last `done` payload `value` / `input` from SSE when the backend sends them. */
  nodeRunArtifacts: Record<string, NodeRunArtifact>;
  errors: ExecutionError[];
  /** Populated on app load from `GET /ollama/models` for LLM node dropdowns. */
  ollamaModels: string[];
  startRun: (nodeIds: string[]) => void;
  updateNodeStatus: (nodeId: string, status: NodeRunStatus) => void;
  appendToken: (nodeId: string, token: string) => void;
  setOllamaModels: (models: string[]) => void;
  setError: (message: string, nodeId?: string) => void;
  setNodeRunArtifact: (nodeId: string, artifact: NodeRunArtifact) => void;
  finishRun: () => void;
  clearErrors: () => void;
  reset: () => void;
}

const initial = {
  status: "idle" as RunStatus,
  nodeStatuses: {} as Record<string, NodeRunStatus>,
  streamingOutput: {} as Record<string, string>,
  nodeRunArtifacts: {} as Record<string, NodeRunArtifact>,
  errors: [] as ExecutionError[],
  ollamaModels: [] as string[],
};

export const useExecutionStore = create<ExecutionState>((set) => ({
  ...initial,

  startRun: (nodeIds) => {
    const nodeStatuses = Object.fromEntries(
      nodeIds.map((id) => [id, "pending" as const]),
    ) as Record<string, NodeRunStatus>;
    set({
      status: "running",
      nodeStatuses,
      streamingOutput: {},
      nodeRunArtifacts: {},
      errors: [],
    });
  },

  updateNodeStatus: (nodeId, status) => {
    set((s) => ({
      nodeStatuses: { ...s.nodeStatuses, [nodeId]: status },
    }));
  },

  appendToken: (nodeId, token) => {
    set((s) => ({
      streamingOutput: {
        ...s.streamingOutput,
        [nodeId]: (s.streamingOutput[nodeId] ?? "") + token,
      },
    }));
  },

  setOllamaModels: (models) => {
    set({ ollamaModels: models });
  },

  setError: (message, nodeId) => {
    set((s) => ({
      status: "error",
      errors: [
        ...s.errors,
        { node_id: nodeId ?? "", message },
      ],
      ...(nodeId
        ? { nodeStatuses: { ...s.nodeStatuses, [nodeId]: "error" as const } }
        : {}),
    }));
  },

  setNodeRunArtifact: (nodeId, artifact) => {
    set((s) => ({
      nodeRunArtifacts: {
        ...s.nodeRunArtifacts,
        [nodeId]: { ...s.nodeRunArtifacts[nodeId], ...artifact },
      },
    }));
  },

  finishRun: () => {
    set({ status: "idle" });
  },

  clearErrors: () => {
    set({ errors: [] });
  },

  reset: () => {
    set(initial);
  },
}));
