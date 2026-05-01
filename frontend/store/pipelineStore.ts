import {
  applyEdgeChanges,
  applyNodeChanges,
  type EdgeChange,
  type NodeChange,
  type Viewport,
  type XYPosition,
} from "@xyflow/react";
import { create } from "zustand";

import type { FlowEdge, FlowNode, FlowNodeData, NodeType, PipelineFile } from "@/types/pipeline";
import { defaultNodeData } from "@/types/pipeline";

const defaultViewport: Viewport = { x: 0, y: 0, zoom: 1 };

function newNodeId(): string {
  return crypto.randomUUID();
}

function newEdgeId(): string {
  return crypto.randomUUID();
}

export interface PipelineState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: Viewport;
  /** Incremented when `loadPipeline` runs so the canvas can apply viewport. */
  loadVersion: number;
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void;
  addNode: (type: NodeType, position?: XYPosition) => void;
  removeNode: (id: string) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  addEdge: (edge: Omit<FlowEdge, "id"> & { id?: string }) => void;
  removeEdge: (id: string) => void;
  setViewport: (viewport: Viewport) => void;
  loadPipeline: (file: PipelineFile) => void;
  /** Select exactly one node (debug panel + canvas sync). */
  focusNode: (id: string) => void;
  /** Select node and open expanded debug I/O dialog (incremented for DebugPanel subscription). */
  focusNodeAndExpandDebugIo: (id: string) => void;
  /** Bumped each time {@link focusNodeAndExpandDebugIo} runs; DebugPanel opens overlay when it changes. */
  debugIoExpandGeneration: number;
  clipboardNode: { type: NodeType; data: FlowNodeData } | null;
  copyNode: (id: string) => void;
  pasteNode: (position: XYPosition) => void;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  nodes: [],
  edges: [],
  viewport: defaultViewport,
  loadVersion: 0,
  debugIoExpandGeneration: 0,
  clipboardNode: null,

  onNodesChange: (changes) => {
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) }));
  },

  onEdgesChange: (changes) => {
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) }));
  },

  addNode: (type, position) => {
    const pos = position ?? { x: 200, y: 200 };
    const node: FlowNode = {
      id: newNodeId(),
      type,
      position: pos,
      data: defaultNodeData(type),
      ...(type === "note" && { connectable: false }),
    };
    set((s) => ({ nodes: [...s.nodes, node] }));
  },

  removeNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
    }));
  },

  updateNodeData: (id, data) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...(n.data as Record<string, unknown>), ...data } as FlowNode["data"] }
          : n,
      ),
    }));
  },

  addEdge: (edge) => {
    const full: FlowEdge = {
      ...edge,
      id: edge.id ?? newEdgeId(),
    };
    set((s) => ({ edges: [...s.edges, full] }));
  },

  removeEdge: (id) => {
    set((s) => ({ edges: s.edges.filter((e) => e.id !== id) }));
  },

  setViewport: (viewport) => {
    set({ viewport });
  },

  loadPipeline: (file) => {
    set((s) => ({
      nodes: file.nodes.map((n) => n.type === "note" ? { ...n, connectable: false } : n),
      edges: file.edges,
      viewport: file.viewport,
      loadVersion: s.loadVersion + 1,
    }));
  },

  focusNode: (id) => {
    set((s) => ({
      nodes: s.nodes.map((n) => ({ ...n, selected: n.id === id })),
    }));
  },

  focusNodeAndExpandDebugIo: (id) => {
    set((s) => ({
      nodes: s.nodes.map((n) => ({ ...n, selected: n.id === id })),
      debugIoExpandGeneration: s.debugIoExpandGeneration + 1,
    }));
  },

  copyNode: (id) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node?.type) return;
    set({ clipboardNode: { type: node.type, data: node.data } });
  },

  pasteNode: (position) => {
    const cb = get().clipboardNode;
    if (!cb) return;
    const node: FlowNode = {
      id: newNodeId(),
      type: cb.type,
      position,
      data: structuredClone(cb.data) as FlowNode["data"],
    };
    set((s) => ({ nodes: [...s.nodes, node] }));
  },
}));
