import { describe, expect, it, vi } from "vitest";

import { loadPipelineFile } from "@/lib/pipelineFile";
import { PIPELINE_FILE_SCHEMA_VERSION, type PipelineFile } from "@/types/pipeline";

describe("loadPipelineFile", () => {
  function pipelineFile(doc: unknown): File {
    return new File([JSON.stringify(doc)], "test.llamagraph.json", {
      type: "application/json",
    });
  }

  it("returns parsed pipeline for schema v1", async () => {
    const doc: PipelineFile = {
      schemaVersion: PIPELINE_FILE_SCHEMA_VERSION,
      savedAt: "2026-01-01T00:00:00.000Z",
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    const file = new File([JSON.stringify(doc)], "test.flowai.json", {
      type: "application/json",
    });
    const result = await loadPipelineFile(file);
    expect(result).toEqual(doc);
  });

  it("rejects files over 2 MB before reading text", async () => {
    const file = new File(["x".repeat(2_000_001)], "large.llamagraph.json");
    const text = vi.fn();
    Object.defineProperty(file, "text", { value: text });

    await expect(loadPipelineFile(file)).rejects.toThrow(/too large/);
    expect(text).not.toHaveBeenCalled();
  });

  it("rejects wrong schema version", async () => {
    const file = new File(
      [JSON.stringify({ schemaVersion: 999, nodes: [], edges: [] })],
      "bad.json",
    );
    await expect(loadPipelineFile(file)).rejects.toThrow(/different version/);
  });

  it("rejects corrupted JSON", async () => {
    const file = new File(["not json"], "x.json");
    await expect(loadPipelineFile(file)).rejects.toThrow(/corrupted/);
  });

  it("rejects unknown node types", async () => {
    const file = pipelineFile({
      schemaVersion: PIPELINE_FILE_SCHEMA_VERSION,
      savedAt: "2026-01-01T00:00:00.000Z",
      nodes: [{ id: "n1", type: "plugin", position: { x: 0, y: 0 }, data: {} }],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    await expect(loadPipelineFile(file)).rejects.toThrow(/unknown node type/);
  });

  it("rejects malformed node and edge shapes", async () => {
    await expect(
      loadPipelineFile(
        pipelineFile({
          schemaVersion: PIPELINE_FILE_SCHEMA_VERSION,
          savedAt: "2026-01-01T00:00:00.000Z",
          nodes: [{ id: 123, type: "input", position: { x: 0, y: 0 }, data: {} }],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        }),
      ),
    ).rejects.toThrow(/malformed node/);

    await expect(
      loadPipelineFile(
        pipelineFile({
          schemaVersion: PIPELINE_FILE_SCHEMA_VERSION,
          savedAt: "2026-01-01T00:00:00.000Z",
          nodes: [{ id: "n1", type: "input", position: { x: 0, y: 0 }, data: {} }],
          edges: [{ id: "e1", source: "n1" }],
          viewport: { x: 0, y: 0, zoom: 1 },
        }),
      ),
    ).rejects.toThrow(/malformed edge/);
  });

  it("normalizes allowed node data fields only", async () => {
    const result = await loadPipelineFile(
      pipelineFile({
        schemaVersion: PIPELINE_FILE_SCHEMA_VERSION,
        savedAt: "2026-01-01T00:00:00.000Z",
        nodes: [
          {
            id: "input-1",
            type: "input",
            position: { x: 10, y: 20 },
            data: { value: "hello", extra: "drop me" },
            selected: true,
          },
          {
            id: "llm-1",
            type: "llm",
            position: { x: 30, y: 40 },
            data: { model: "mistral", temperature: 2, systemPrompt: "be brief", extra: true },
          },
          {
            id: "output-1",
            type: "output",
            position: { x: 50, y: 60 },
            data: { lastRunAt: "drop saved runtime field" },
          },
        ],
        edges: [{ id: "e1", source: "input-1", target: "llm-1", sourceHandle: 123 }],
        viewport: { x: 0, y: 0, zoom: 1 },
      }),
    );

    expect(result.nodes).toEqual([
      { id: "input-1", type: "input", position: { x: 10, y: 20 }, data: { value: "hello" } },
      {
        id: "llm-1",
        type: "llm",
        position: { x: 30, y: 40 },
        data: { model: "mistral", temperature: 2, systemPrompt: "be brief" },
      },
      { id: "output-1", type: "output", position: { x: 50, y: 60 }, data: {} },
    ]);
    expect(result.edges).toEqual([{ id: "e1", source: "input-1", target: "llm-1" }]);
  });

  it("rejects oversized node strings", async () => {
    const file = pipelineFile({
      schemaVersion: PIPELINE_FILE_SCHEMA_VERSION,
      savedAt: "2026-01-01T00:00:00.000Z",
      nodes: [
        {
          id: "input-1",
          type: "input",
          position: { x: 0, y: 0 },
          data: { value: "x".repeat(20_001) },
        },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    await expect(loadPipelineFile(file)).rejects.toThrow(/too long/);
  });

  it("normalizes unsafe viewport values", async () => {
    const result = await loadPipelineFile(
      pipelineFile({
        schemaVersion: PIPELINE_FILE_SCHEMA_VERSION,
        savedAt: "2026-01-01T00:00:00.000Z",
        nodes: [],
        edges: [],
        viewport: { x: 1e309, y: "bad", zoom: 99 },
      }),
    );

    expect(result.viewport).toEqual({ x: 0, y: 0, zoom: 4 });
  });
});
