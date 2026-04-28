import { describe, expect, it } from "vitest";

import { previewTransformExtract, previewTransformTemplate } from "@/lib/transformPreview";

const SAMPLE_JSON = '{"user":{"name":"Alice"},"items":[{"id":1}]}';

describe("previewTransformExtract", () => {
  it("returns blank when upstream is empty", () => {
    expect(previewTransformExtract("user.name", "")).toBe("");
    expect(previewTransformExtract("", "")).toBe("");
  });

  it("shows full JSON document when path is empty", () => {
    expect(previewTransformExtract("", SAMPLE_JSON)).toBe(SAMPLE_JSON);
  });

  it("extracts nested field", () => {
    expect(previewTransformExtract("user.name", SAMPLE_JSON)).toBe("Alice");
  });

  it("extracts array index path", () => {
    expect(previewTransformExtract("items.0.id", SAMPLE_JSON)).toBe("1");
  });

  it("returns parse error when upstream is not valid JSON", () => {
    expect(previewTransformExtract("user.name", "plain text")).toBe(
      "No preview — upstream value is not valid JSON.",
    );
  });

  it("returns path error when JSON is valid but path is missing", () => {
    expect(previewTransformExtract("does.not.exist", SAMPLE_JSON)).toBe(
      "No preview — path not found in JSON.",
    );
  });

  it("unwraps markdown code fences before parsing", () => {
    const fenced = "```json\n" + SAMPLE_JSON + "\n```";
    expect(previewTransformExtract("user.name", fenced)).toBe("Alice");
  });

  it("unwraps bare code fences (no language tag)", () => {
    const fenced = "```\n" + SAMPLE_JSON + "\n```";
    expect(previewTransformExtract("user.name", fenced)).toBe("Alice");
  });
});

describe("previewTransformTemplate", () => {
  it("returns blank when upstream is empty", () => {
    expect(previewTransformTemplate("Hello {{input}}!", "")).toBe("");
  });

  it("replaces input placeholder with upstream value", () => {
    expect(previewTransformTemplate("Hello {{input}}!", "World")).toBe("Hello World!");
  });

  it("handles whitespace variants of the placeholder", () => {
    expect(previewTransformTemplate("{{ input }}", "foo")).toBe("foo");
  });
});
