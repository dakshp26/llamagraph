/** Matches backend `_PLACEHOLDER_RE` in services/constants.py. */
const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

/**
 * Re-resolves a prompt template against a map of handle → upstream value.
 * Unconnected placeholders are kept as-is (e.g. {{name}}).
 */
export function resolvePromptTemplate(
  template: string,
  handleValues: Record<string, string>,
): string {
  return template.replace(
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
    (match, name: string) => (name in handleValues ? handleValues[name] : match),
  );
}

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
