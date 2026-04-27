import { describe, expect, it } from "vitest";

import { topologicalNodeIds } from "@/lib/graphOrder";

function n(
  id: string,
): { id: string; type: "input"; position: { x: number; y: number }; data: { value: string } } {
  return { id, type: "input", position: { x: 0, y: 0 }, data: { value: "" } };
}

describe("topologicalNodeIds", () => {
  it("orders a simple chain a → b → c", () => {
    const nodes = [n("a"), n("b"), n("c")];
    const edges = [
      { id: "e1", source: "a", target: "b" },
      { id: "e2", source: "b", target: "c" },
    ];
    expect(topologicalNodeIds(nodes, edges)).toEqual(["a", "b", "c"]);
  });

  it("breaks ties by first appearance in nodes", () => {
    const nodes = [n("x"), n("y"), n("z")];
    const edges: { id: string; source: string; target: string }[] = [];
    const o = topologicalNodeIds(nodes, edges);
    expect(o).toEqual(["x", "y", "z"]);
  });
});
