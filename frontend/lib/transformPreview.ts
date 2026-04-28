const TEMPLATE_INPUT_RE = /\{\{\s*input\s*\}\}/g;

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".").filter((p) => p.trim() !== "");
  if (parts.length === 0) {
    throw new Error("empty path");
  }
  let cur: unknown = obj;
  for (const part of parts) {
    if (Array.isArray(cur)) {
      const idx = Number(part);
      if (!Number.isInteger(idx) || String(idx) !== part) {
        throw new Error("bad index");
      }
      if (idx < 0 || idx >= cur.length) {
        throw new Error("out of range");
      }
      cur = cur[idx];
    } else if (cur !== null && typeof cur === "object") {
      if (!Object.prototype.hasOwnProperty.call(cur, part)) {
        throw new Error("missing key");
      }
      cur = (cur as Record<string, unknown>)[part];
    } else {
      throw new Error("not traversable");
    }
  }
  return cur;
}

function formatExtracted(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") {
    return JSON.stringify(val);
  }
  return String(val);
}

function unwrapJsonFence(raw: string): string {
  const s = raw.trim();
  if (!s.startsWith("```")) return s;
  const lines = s.split("\n");
  if (lines[0].trimStart().startsWith("```")) lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  if (lines.length > 0 && lines[lines.length - 1].trim().startsWith("```")) lines.pop();
  return lines.join("\n").trim();
}

/**
 * Preview extract mode using the provided upstream string.
 * Returns blank when upstream is empty or not yet available.
 */
export function previewTransformExtract(path: string, upstream: string): string {
  if (!upstream.trim()) return "";
  const p = path.trim();
  let doc: unknown;
  try {
    doc = JSON.parse(unwrapJsonFence(upstream));
  } catch {
    return "No preview — upstream value is not valid JSON.";
  }
  if (!p) return formatExtracted(doc);
  try {
    return formatExtracted(getByPath(doc, p));
  } catch {
    return "No preview — path not found in JSON.";
  }
}

/**
 * Preview template mode by substituting {{input}} with the upstream string.
 * Returns blank when upstream is empty or not yet available.
 */
export function previewTransformTemplate(template: string, upstream: string): string {
  if (!upstream.trim()) return "";
  return template.replace(TEMPLATE_INPUT_RE, upstream);
}
