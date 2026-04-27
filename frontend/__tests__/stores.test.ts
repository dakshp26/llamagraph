import { describe, expect, it, beforeEach } from "vitest";

import { loadPipelineFile } from "@/lib/pipelineFile";
import { useExecutionStore } from "@/store/executionStore";
import { usePipelineStore } from "@/store/pipelineStore";
import { PIPELINE_FILE_SCHEMA_VERSION, type PipelineFile } from "@/types/pipeline";

describe("pipelineStore", () => {
  beforeEach(() => {
    usePipelineStore.setState({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      loadVersion: 0,
    });
  });

  it("addNode adds a node", () => {
    usePipelineStore.getState().addNode("input", { x: 10, y: 20 });
    const { nodes } = usePipelineStore.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe("input");
    expect(nodes[0].position).toEqual({ x: 10, y: 20 });
    expect(nodes[0].data).toEqual({ value: "" });
  });

  it("removeNode removes the node and any connected edges", () => {
    usePipelineStore.setState({
      nodes: [
        {
          id: "a",
          type: "input",
          position: { x: 0, y: 0 },
          data: { value: "" },
        },
        {
          id: "b",
          type: "output",
          position: { x: 100, y: 0 },
          data: {},
        },
      ],
      edges: [
        {
          id: "e1",
          source: "a",
          target: "b",
        },
      ],
    });
    usePipelineStore.getState().removeNode("a");
    const { nodes, edges } = usePipelineStore.getState();
    expect(nodes.map((n) => n.id)).toEqual(["b"]);
    expect(edges).toHaveLength(0);
  });
});

describe("pipelineStore import path", () => {
  const initialNodes = [
    { id: "a", type: "input" as const, position: { x: 0, y: 0 }, data: { value: "hello" } },
  ];
  const initialEdges = [{ id: "e1", source: "a", target: "b" }];
  const initialViewport = { x: 10, y: 20, zoom: 2 };

  function pipelineFile(doc: unknown): File {
    return new File([JSON.stringify(doc)], "test.llamagraph.json", {
      type: "application/json",
    });
  }

  const validDoc: PipelineFile = {
    schemaVersion: PIPELINE_FILE_SCHEMA_VERSION,
    savedAt: "2026-01-01T00:00:00.000Z",
    nodes: [
      { id: "x1", type: "output", position: { x: 5, y: 5 }, data: {} },
    ],
    edges: [],
    viewport: { x: 1, y: 2, zoom: 1.5 },
  };

  beforeEach(() => {
    usePipelineStore.setState({
      nodes: initialNodes,
      edges: initialEdges,
      viewport: initialViewport,
      loadVersion: 3,
    });
  });

  it("rejected import (oversized file) leaves graph and loadVersion unchanged", async () => {
    const bigFile = new File(["x".repeat(2_000_001)], "big.llamagraph.json");
    await expect(loadPipelineFile(bigFile)).rejects.toThrow(/too large/);
    const { nodes, edges, viewport, loadVersion } = usePipelineStore.getState();
    expect(nodes).toEqual(initialNodes);
    expect(edges).toEqual(initialEdges);
    expect(viewport).toEqual(initialViewport);
    expect(loadVersion).toBe(3);
  });

  it("rejected import (unknown node type) leaves graph and loadVersion unchanged", async () => {
    const file = pipelineFile({
      schemaVersion: PIPELINE_FILE_SCHEMA_VERSION,
      savedAt: "2026-01-01T00:00:00.000Z",
      nodes: [{ id: "n1", type: "plugin", position: { x: 0, y: 0 }, data: {} }],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    await expect(loadPipelineFile(file)).rejects.toThrow(/unknown node type/);
    const { nodes, edges, viewport, loadVersion } = usePipelineStore.getState();
    expect(nodes).toEqual(initialNodes);
    expect(edges).toEqual(initialEdges);
    expect(viewport).toEqual(initialViewport);
    expect(loadVersion).toBe(3);
  });

  it("rejected import (malformed edge) leaves graph and loadVersion unchanged", async () => {
    const file = pipelineFile({
      schemaVersion: PIPELINE_FILE_SCHEMA_VERSION,
      savedAt: "2026-01-01T00:00:00.000Z",
      nodes: [{ id: "n1", type: "input", position: { x: 0, y: 0 }, data: {} }],
      edges: [{ id: "e1", source: "n1" }],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    await expect(loadPipelineFile(file)).rejects.toThrow(/malformed edge/);
    const { nodes, edges, viewport, loadVersion } = usePipelineStore.getState();
    expect(nodes).toEqual(initialNodes);
    expect(edges).toEqual(initialEdges);
    expect(viewport).toEqual(initialViewport);
    expect(loadVersion).toBe(3);
  });

  it("valid import increments loadVersion and replaces graph state", async () => {
    const file = pipelineFile(validDoc);
    const parsed = await loadPipelineFile(file);
    usePipelineStore.getState().loadPipeline(parsed);
    const { nodes, edges, viewport, loadVersion } = usePipelineStore.getState();
    expect(nodes).toEqual(validDoc.nodes);
    expect(edges).toEqual(validDoc.edges);
    expect(viewport).toEqual(validDoc.viewport);
    expect(loadVersion).toBe(4);
  });
});

describe("executionStore", () => {
  beforeEach(() => {
    useExecutionStore.getState().reset();
  });

  it("appendToken accumulates streaming text per node", () => {
    const { appendToken } = useExecutionStore.getState();
    appendToken("llm-1", "Hello");
    appendToken("llm-1", " world");
    expect(useExecutionStore.getState().streamingOutput["llm-1"]).toBe("Hello world");
  });

  it("setOllamaModels stores model names for LLM dropdowns", () => {
    useExecutionStore.getState().setOllamaModels(["a", "b"]);
    expect(useExecutionStore.getState().ollamaModels).toEqual(["a", "b"]);
  });

  it("startRun marks every node pending and clears streaming state", () => {
    useExecutionStore.getState().appendToken("a", "x");
    useExecutionStore.getState().setNodeRunArtifact("a", { value: "z" });
    useExecutionStore.getState().startRun(["n1", "n2"]);
    const s = useExecutionStore.getState();
    expect(s.status).toBe("running");
    expect(s.nodeStatuses).toEqual({ n1: "pending", n2: "pending" });
    expect(s.streamingOutput).toEqual({});
    expect(s.nodeRunArtifacts).toEqual({});
    expect(s.errors).toEqual([]);
  });
});
