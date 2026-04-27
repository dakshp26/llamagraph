import { describe, expect, it } from "vitest";

import { previewTransformExtract, previewTransformTemplate } from "@/lib/transformPreview";

describe("previewTransformExtract", () => {
  it("shows full sample JSON when path is empty", () => {
    expect(previewTransformExtract("")).toBe(
      '{"user":{"name":"Alice"},"items":[{"id":1}]}',
    );
  });

  it("extracts nested field from sample JSON", () => {
    expect(previewTransformExtract("user.name")).toBe("Alice");
  });

  it("extracts array index path", () => {
    expect(previewTransformExtract("items.0.id")).toBe("1");
  });
});

describe("previewTransformTemplate", () => {
  it("replaces input placeholder with sample", () => {
    expect(previewTransformTemplate("Hello {{input}}!")).toBe("Hello World!");
  });
});
