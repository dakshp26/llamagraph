/** Matches backend `backend/services/graph.py` `_PLACEHOLDER_RE`. */
const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

/** Unique placeholder names in order of first appearance. */
export function extractPromptPlaceholders(template: string): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  PLACEHOLDER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PLACEHOLDER_RE.exec(template)) !== null) {
    const name = m[1];
    if (!seen.has(name)) {
      seen.add(name);
      order.push(name);
    }
  }
  return order;
}
