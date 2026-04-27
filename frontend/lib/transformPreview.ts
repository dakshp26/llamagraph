/** Fixed sample used only for the Transform node's live preview UI. */
export const TRANSFORM_SAMPLE_JSON = '{"user":{"name":"Alice"},"items":[{"id":1}]}';

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

/** Preview extract mode using a fixed sample JSON document. */
export function previewTransformExtract(path: string): string {
  const p = path.trim();
  try {
    const doc = JSON.parse(TRANSFORM_SAMPLE_JSON) as unknown;
    if (!p) {
      return formatExtracted(doc);
    }
    const val = getByPath(doc, p);
    return formatExtracted(val);
  } catch {
    return "No preview — check the path against the sample JSON.";
  }
}

const SAMPLE_TEMPLATE_INPUT = "World";

/** Preview template mode by substituting {{input}} with a fixed sample. */
export function previewTransformTemplate(template: string): string {
  return template.replace(TEMPLATE_INPUT_RE, SAMPLE_TEMPLATE_INPUT);
}
