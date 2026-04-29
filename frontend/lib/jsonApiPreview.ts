import type { JsonApiNodeData } from "@/types/pipeline";

export function buildCurlPreview(data: JsonApiNodeData): string {
  if (!data.url) return "";

  const params = data.params.filter((p) => p.key !== "");
  const headers = data.headers.filter((h) => h.key !== "");

  let urlPart = data.url;
  if (params.length > 0) {
    urlPart += "?" + params.map((p) => `${p.key}=${p.value}`).join("&");
  }

  const lines: string[] = [`curl "${urlPart}"`];
  for (const h of headers) {
    lines.push(`  -H "${h.key}: ${h.value}"`);
  }

  return lines.join("\n");
}
