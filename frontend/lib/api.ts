import type { GraphPayload, ValidateResponse } from "@/types/pipeline";

export function getApiBase(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return "http://localhost:8000";
}

export async function validatePipeline(
  graph: GraphPayload,
): Promise<ValidateResponse> {
  const res = await fetch(`${getApiBase()}/pipeline/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(graph),
  });
  if (!res.ok) {
    throw new Error(`Validation request failed (${res.status})`);
  }
  return res.json() as Promise<ValidateResponse>;
}

export async function getOllamaHealth(): Promise<{ running: boolean }> {
  try {
    const res = await fetch(`${getApiBase()}/ollama/health`);
    if (!res.ok) return { running: false };
    return res.json() as Promise<{ running: boolean }>;
  } catch {
    return { running: false };
  }
}

export async function getOllamaModels(): Promise<{ models: string[] }> {
  try {
    const res = await fetch(`${getApiBase()}/ollama/models`);
    if (!res.ok) return { models: [] };
    return res.json() as Promise<{ models: string[] }>;
  } catch {
    return { models: [] };
  }
}
