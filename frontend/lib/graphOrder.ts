import type { Edge, Node } from "@xyflow/react";

import type { FlowNode } from "@/types/pipeline";

/**
 * Kahn topological order of node ids. Stable: ties break by first appearance in `nodes`.
 * Unreachable / cycle leftovers append in document order.
 */
export function topologicalNodeIds<Fn extends Node>(nodes: Fn[], edges: Edge[]): string[] {
  const ids = nodes.map((n) => n.id);
  const idSet = new Set(ids);
  const index = new Map<string, number>();
  ids.forEach((id, i) => index.set(id, i));

  const inDeg = new Map<string, number>();
  for (const id of ids) inDeg.set(id, 0);
  const outAdj = new Map<string, string[]>();
  for (const id of ids) outAdj.set(id, []);
  for (const e of edges) {
    if (idSet.has(e.source) && idSet.has(e.target)) {
      outAdj.get(e.source)!.push(e.target);
      inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
    }
  }

  const q = ids
    .filter((id) => (inDeg.get(id) ?? 0) === 0)
    .sort((a, b) => (index.get(a) ?? 0) - (index.get(b) ?? 0));

  const result: string[] = [];
  const head = [...q];
  const seen = new Set<string>();

  while (head.length) {
    const u = head.shift()!;
    if (seen.has(u)) continue;
    seen.add(u);
    result.push(u);
    for (const v of (outAdj.get(u) ?? []).sort(
      (a, b) => (index.get(a) ?? 0) - (index.get(b) ?? 0),
    )) {
      const d = (inDeg.get(v) ?? 0) - 1;
      inDeg.set(v, d);
      if (d === 0) {
        head.push(v);
        head.sort((a, b) => (index.get(a) ?? 0) - (index.get(b) ?? 0));
      }
    }
  }

  for (const id of ids) {
    if (!seen.has(id)) result.push(id);
  }
  return result;
}

export function orderNodes<Fn extends FlowNode>(nodes: Fn[], edges: Edge[]): Fn[] {
  const order = topologicalNodeIds(nodes, edges);
  const m = new Map(nodes.map((n) => [n.id, n]));
  return order.map((id) => m.get(id)!).filter(Boolean) as Fn[];
}
