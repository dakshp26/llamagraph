import { usePipelineStore } from "@/store/pipelineStore";
import { useExecutionStore, type NodeRunArtifact } from "@/store/executionStore";
import type { FlowEdge, PromptNodeData, TransformNodeData } from "@/types/pipeline";
import { resolvePromptTemplate } from "./promptPlaceholders";
import { previewTransformExtract, previewTransformTemplate } from "./transformPreview";

interface PreviewCtx {
  nodeId: string;
  artifact: NodeRunArtifact | undefined;
  allArtifacts: Record<string, NodeRunArtifact>;
  edges: FlowEdge[];
}

type PreviewFn = (data: unknown, ctx: PreviewCtx) => string;

/**
 * Registry mapping node type → preview computation.
 * Each function receives the node's data and a context with:
 *   - artifact:     this node's own last-run artifact ({ value, input })
 *   - allArtifacts: every node's last-run artifact (for reading upstream values)
 *   - edges:        all graph edges (for resolving handle connections)
 * Return "" to show the "run prior nodes" hint instead of a preview.
 * To add a preview for a new node type, add one entry here.
 */
const previewRegistry: Partial<Record<string, PreviewFn>> = {
  transform: (data, { artifact }) => {
    const d = data as TransformNodeData;
    const upstream = artifact?.input ?? "";
    return d.mode === "template"
      ? previewTransformTemplate(d.template, upstream)
      : previewTransformExtract(d.path, upstream);
  },

  prompt: (data, { nodeId, edges, allArtifacts }) => {
    const d = data as PromptNodeData;
    if (!d.template.trim()) return "";

    const incoming = edges.filter((e) => e.target === nodeId && e.targetHandle);

    // Static prompt with no placeholder connections — preview is the raw template
    if (incoming.length === 0) return d.template;

    // Placeholder connections exist but nothing has run yet
    const hasAnyRun = incoming.some((e) => e.source in allArtifacts);
    if (!hasAnyRun) return "";

    const handleValues: Record<string, string> = {};
    for (const e of incoming) {
      handleValues[e.targetHandle as string] = allArtifacts[e.source]?.value ?? "";
    }
    return resolvePromptTemplate(d.template, handleValues);
  },
};

export function computeNodePreview(type: string, data: unknown, ctx: PreviewCtx): string {
  return previewRegistry[type]?.(data, ctx) ?? "";
}

export function useNodePreview(nodeId: string, type: string, data: unknown): string {
  const allArtifacts = useExecutionStore((s) => s.nodeRunArtifacts);
  const edges = usePipelineStore((s) => s.edges);
  return computeNodePreview(type, data, {
    nodeId,
    artifact: allArtifacts[nodeId],
    allArtifacts,
    edges,
  });
}
