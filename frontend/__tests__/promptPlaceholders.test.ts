import { describe, expect, it } from "vitest";

import { extractPromptPlaceholders } from "@/lib/promptPlaceholders";

describe("extractPromptPlaceholders", () => {
  it("returns ordered unique names for {{name}} patterns", () => {
    expect(extractPromptPlaceholders("Hi {{name}}, from {{name}} and {{other}}")).toEqual([
      "name",
      "other",
    ]);
  });

  it("allows spaces inside braces like the backend", () => {
    expect(extractPromptPlaceholders("{{  user_id  }}")).toEqual(["user_id"]);
  });

  it("returns empty list when there are no placeholders", () => {
    expect(extractPromptPlaceholders("plain text")).toEqual([]);
  });
});
