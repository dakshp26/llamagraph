import type { JsonApiNodeData } from "@/types/pipeline";

function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

export function buildCurlPreview(data: JsonApiNodeData): string {
  if (!data.url) return "";

  const params = data.params.filter((p) => p.key !== "");
  const headers = data.headers.filter((h) => h.key !== "");

  let urlPart = data.url;
  if (params.length > 0) {
    const qs = new URLSearchParams(params.map((p) => [p.key, p.value]))
      .toString()
      .replace(/%7B%7B/gi, "{{")
      .replace(/%7D%7D/gi, "}}");
    urlPart += "?" + qs;
  }

  const lines: string[] = [`curl ${shellQuote(urlPart)}`];
  for (const h of headers) {
    lines.push(`  -H ${shellQuote(`${h.key}: ${h.value}`)}`);
  }

  return lines.join("\n");
}
