import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// pipeline types — defaultNodeData
// ---------------------------------------------------------------------------
import { defaultNodeData } from "@/types/pipeline";

describe("defaultNodeData — file input types", () => {
  it("returns { filename: '' } for pdf_input", () => {
    expect(defaultNodeData("pdf_input")).toEqual({ filename: "" });
  });

  it("returns { filename: '' } for docx_input", () => {
    expect(defaultNodeData("docx_input")).toEqual({ filename: "" });
  });

  it("returns { filename: '' } for ppt_input", () => {
    expect(defaultNodeData("ppt_input")).toEqual({ filename: "" });
  });
});

// ---------------------------------------------------------------------------
// nodeConfig — NODE_META + NODE_CATEGORIES
// ---------------------------------------------------------------------------
import { NODE_META, NODE_CATEGORIES } from "@/lib/nodeConfig";

describe("NODE_META — file input entries", () => {
  it("pdf_input has correct label, abbr and color", () => {
    expect(NODE_META.pdf_input).toEqual({ label: "PDF Input", abbr: "PDF", color: "#e05252" });
  });

  it("docx_input has correct label, abbr and color", () => {
    expect(NODE_META.docx_input).toEqual({ label: "DOCX Input", abbr: "DOC", color: "#2b7be0" });
  });

  it("ppt_input has correct label, abbr and color", () => {
    expect(NODE_META.ppt_input).toEqual({ label: "PPT Input", abbr: "PPT", color: "#e07c2b" });
  });
});

describe("NODE_CATEGORIES — sources includes file input types", () => {
  const sources = NODE_CATEGORIES.find((c) => c.label === "sources")!;

  it("includes pdf_input", () => {
    expect(sources.types).toContain("pdf_input");
  });

  it("includes docx_input", () => {
    expect(sources.types).toContain("docx_input");
  });

  it("includes ppt_input", () => {
    expect(sources.types).toContain("ppt_input");
  });
});

// ---------------------------------------------------------------------------
// nodePreview — computeNodePreview for file input nodes
// ---------------------------------------------------------------------------
import { computeNodePreview } from "@/lib/nodePreview";

const emptyCtx = {
  nodeId: "n1",
  artifact: undefined,
  allArtifacts: {},
  edges: [],
};

describe("computeNodePreview — file input nodes return filename", () => {
  it("pdf_input returns the stored filename", () => {
    expect(computeNodePreview("pdf_input", { filename: "report.pdf" }, emptyCtx)).toBe("report.pdf");
  });

  it("docx_input returns the stored filename", () => {
    expect(computeNodePreview("docx_input", { filename: "notes.docx" }, emptyCtx)).toBe("notes.docx");
  });

  it("ppt_input returns the stored filename", () => {
    expect(computeNodePreview("ppt_input", { filename: "deck.pptx" }, emptyCtx)).toBe("deck.pptx");
  });

  it("returns empty string when filename is absent", () => {
    expect(computeNodePreview("pdf_input", {}, emptyCtx)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// pipelineFile — loadPipelineFile round-trips file input nodes
// ---------------------------------------------------------------------------
import { loadPipelineFile } from "@/lib/pipelineFile";
import { PIPELINE_FILE_SCHEMA_VERSION } from "@/types/pipeline";

function makeFile(content: object): File {
  const blob = new Blob([JSON.stringify(content)], { type: "application/json" });
  return new File([blob], "test.llamagraph.json", { type: "application/json" });
}

const basePayload = {
  schemaVersion: PIPELINE_FILE_SCHEMA_VERSION,
  savedAt: "2026-05-04T00:00:00.000Z",
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

describe("loadPipelineFile — file input nodes", () => {
  it("loads a pdf_input node with a filename", async () => {
    const file = makeFile({
      ...basePayload,
      nodes: [{ id: "n1", type: "pdf_input", position: { x: 0, y: 0 }, data: { filename: "report.pdf" } }],
    });
    const result = await loadPipelineFile(file);
    expect(result.nodes[0].type).toBe("pdf_input");
    expect(result.nodes[0].data).toEqual({ filename: "report.pdf" });
  });

  it("loads a docx_input node with a filename", async () => {
    const file = makeFile({
      ...basePayload,
      nodes: [{ id: "n1", type: "docx_input", position: { x: 0, y: 0 }, data: { filename: "notes.docx" } }],
    });
    const result = await loadPipelineFile(file);
    expect(result.nodes[0].type).toBe("docx_input");
    expect(result.nodes[0].data).toEqual({ filename: "notes.docx" });
  });

  it("loads a ppt_input node with a filename", async () => {
    const file = makeFile({
      ...basePayload,
      nodes: [{ id: "n1", type: "ppt_input", position: { x: 0, y: 0 }, data: { filename: "deck.pptx" } }],
    });
    const result = await loadPipelineFile(file);
    expect(result.nodes[0].type).toBe("ppt_input");
    expect(result.nodes[0].data).toEqual({ filename: "deck.pptx" });
  });

  it("defaults missing filename to empty string", async () => {
    const file = makeFile({
      ...basePayload,
      nodes: [{ id: "n1", type: "pdf_input", position: { x: 0, y: 0 }, data: {} }],
    });
    const result = await loadPipelineFile(file);
    expect(result.nodes[0].data).toEqual({ filename: "" });
  });

  it("rejects a file input node with a non-string filename", async () => {
    const file = makeFile({
      ...basePayload,
      nodes: [{ id: "n1", type: "pdf_input", position: { x: 0, y: 0 }, data: { filename: 123 } }],
    });
    await expect(loadPipelineFile(file)).rejects.toThrow("malformed node");
  });

  it("preserves filename-only — does not persist markdown content", async () => {
    const file = makeFile({
      ...basePayload,
      nodes: [{ id: "n1", type: "pdf_input", position: { x: 0, y: 0 }, data: { filename: "r.pdf", markdown: "# ignored" } }],
    });
    const result = await loadPipelineFile(file);
    expect((result.nodes[0].data as Record<string, unknown>).markdown).toBeUndefined();
  });
});
