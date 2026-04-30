import type { JsonApiNodeData, JsonApiParam } from "@/types/pipeline";

type UpdateNodeData = (id: string, patch: Record<string, unknown>) => void;

export function makeJsonApiParamHandlers(
  nodeId: string,
  data: JsonApiNodeData,
  updateNodeData: UpdateNodeData,
) {
  return {
    updateParam(index: number, field: keyof JsonApiParam, value: string) {
      const next = data.params.map((p, i) => (i === index ? { ...p, [field]: value } : p));
      updateNodeData(nodeId, { params: next });
    },
    addParam() {
      updateNodeData(nodeId, {
        params: [...data.params, { id: crypto.randomUUID(), key: "", value: "" }],
      });
    },
    removeParam(index: number) {
      updateNodeData(nodeId, { params: data.params.filter((_, i) => i !== index) });
    },
    updateHeader(index: number, field: keyof JsonApiParam, value: string) {
      const next = data.headers.map((h, i) => (i === index ? { ...h, [field]: value } : h));
      updateNodeData(nodeId, { headers: next });
    },
    addHeader() {
      updateNodeData(nodeId, {
        headers: [...data.headers, { id: crypto.randomUUID(), key: "", value: "" }],
      });
    },
    removeHeader(index: number) {
      updateNodeData(nodeId, { headers: data.headers.filter((_, i) => i !== index) });
    },
  };
}
