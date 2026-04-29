import { describe, expect, it } from "vitest";

import { buildCurlPreview } from "@/lib/jsonApiPreview";
import type { JsonApiNodeData } from "@/types/pipeline";

function make(partial: Partial<JsonApiNodeData>): JsonApiNodeData {
  return { url: "", params: [], headers: [], ...partial };
}

describe("buildCurlPreview", () => {
  it("returns empty string for empty URL", () => {
    expect(buildCurlPreview(make({}))).toBe("");
  });

  it("URL only, no params or headers", () => {
    expect(buildCurlPreview(make({ url: "https://api.example.com/data" }))).toBe(
      'curl "https://api.example.com/data"',
    );
  });

  it("URL + params appended as query string", () => {
    const result = buildCurlPreview(
      make({
        url: "https://api.example.com/data",
        params: [
          { key: "foo", value: "bar" },
          { key: "baz", value: "qux" },
        ],
      }),
    );
    expect(result).toBe('curl "https://api.example.com/data?foo=bar&baz=qux"');
  });

  it("URL + params + headers", () => {
    const result = buildCurlPreview(
      make({
        url: "https://api.example.com",
        params: [{ key: "q", value: "hello" }],
        headers: [{ key: "Authorization", value: "Bearer token" }],
      }),
    );
    expect(result).toBe(
      'curl "https://api.example.com?q=hello"\n  -H "Authorization: Bearer token"',
    );
  });

  it("headers only (no params), no ? in URL", () => {
    const result = buildCurlPreview(
      make({
        url: "https://api.example.com",
        headers: [{ key: "X-Custom", value: "val" }],
      }),
    );
    expect(result).toBe('curl "https://api.example.com"\n  -H "X-Custom: val"');
  });

  it("{{handle}} token in param value passes through unchanged", () => {
    const result = buildCurlPreview(
      make({
        url: "https://api.example.com",
        params: [{ key: "q", value: "{{query}}" }],
      }),
    );
    expect(result).toBe('curl "https://api.example.com?q={{query}}"');
  });

  it("{{handle}} token in URL passes through unchanged", () => {
    const result = buildCurlPreview(
      make({ url: "https://{{host}}/api" }),
    );
    expect(result).toBe('curl "https://{{host}}/api"');
  });

  it("rows with empty keys are excluded from params", () => {
    const result = buildCurlPreview(
      make({
        url: "https://api.example.com",
        params: [
          { key: "", value: "ignored" },
          { key: "keep", value: "yes" },
        ],
      }),
    );
    expect(result).toBe('curl "https://api.example.com?keep=yes"');
  });

  it("rows with empty keys are excluded from headers", () => {
    const result = buildCurlPreview(
      make({
        url: "https://api.example.com",
        headers: [
          { key: "", value: "ignored" },
          { key: "Accept", value: "application/json" },
        ],
      }),
    );
    expect(result).toBe('curl "https://api.example.com"\n  -H "Accept: application/json"');
  });

  it("multiple headers each on their own line", () => {
    const result = buildCurlPreview(
      make({
        url: "https://api.example.com",
        headers: [
          { key: "Accept", value: "application/json" },
          { key: "X-Token", value: "abc" },
        ],
      }),
    );
    expect(result).toBe(
      'curl "https://api.example.com"\n  -H "Accept: application/json"\n  -H "X-Token: abc"',
    );
  });
});
