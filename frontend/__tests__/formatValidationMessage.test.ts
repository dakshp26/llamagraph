import { describe, expect, it } from "vitest";

import { formatValidationMessage } from "@/lib/formatValidationMessage";

describe("formatValidationMessage", () => {
  it("maps cycle errors to a friendly sentence", () => {
    expect(formatValidationMessage("The graph contains a cycle and cannot run.")).toBe(
      "Your pipeline has a loop. Remove one connection to fix it.",
    );
  });

  it("passes through other messages", () => {
    expect(formatValidationMessage("Add at least one Input node.")).toBe("Add at least one Input node.");
  });
});
