import { getApiBase } from "@/lib/api";
import type { GraphPayload } from "@/types/pipeline";

export interface RunPipelineCallbacks {
  onToken: (nodeId: string, token: string) => void;
  onNodeStatus: (
    nodeId: string,
    status: string,
    payload: Record<string, unknown>,
  ) => void;
  onError: (message: string, nodeId?: string) => void;
  onDone: () => void;
}

function parseSseBlock(
  eventName: string | undefined,
  dataLines: string[],
  callbacks: RunPipelineCallbacks,
  finish: () => void,
): void {
  if (!eventName || dataLines.length === 0) return;
  const dataStr = dataLines.join("\n");
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(dataStr) as Record<string, unknown>;
  } catch {
    return;
  }

  if (eventName === "token") {
    const nodeId = data.node_id;
    const content = data.content;
    if (typeof nodeId === "string" && typeof content === "string") {
      callbacks.onToken(nodeId, content);
    }
    return;
  }

  if (eventName === "node_status") {
    const nodeId = data.node_id;
    const status = data.status;
    if (typeof nodeId === "string" && typeof status === "string") {
      callbacks.onNodeStatus(nodeId, status, data);
    }
    return;
  }

  if (eventName === "error") {
    const message = data.message;
    const nodeId = typeof data.node_id === "string" ? data.node_id : undefined;
    callbacks.onError(typeof message === "string" ? message : "Pipeline error", nodeId);
    return;
  }

  if (eventName === "done") {
    finish();
  }
}

export async function runPipeline(
  graph: GraphPayload,
  callbacks: RunPipelineCallbacks,
): Promise<void> {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    callbacks.onDone();
  };

  let res: Response;
  try {
    res = await fetch(`${getApiBase()}/pipeline/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(graph),
    });
  } catch {
    callbacks.onError("Could not reach the LlamaGraph backend.");
    finish();
    return;
  }

  if (!res.ok || !res.body) {
    callbacks.onError(`Run request failed (${res.status})`);
    finish();
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent: string | undefined;
  let dataLines: string[] = [];

  const flushEvent = () => {
    parseSseBlock(currentEvent, dataLines, callbacks, finish);
    currentEvent = undefined;
    dataLines = [];
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n/);
      buffer = parts.pop() ?? "";

      for (const line of parts) {
        if (line.startsWith("event:")) {
          if (currentEvent !== undefined || dataLines.length > 0) flushEvent();
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart());
        } else if (line === "") {
          if (currentEvent !== undefined || dataLines.length > 0) flushEvent();
        }
      }
    }
    if (currentEvent !== undefined || dataLines.length > 0) flushEvent();
  } finally {
    finish();
  }
}
