"use client";

import type { NodeProps } from "@xyflow/react";
import type { FlowNode } from "@/types/pipeline";
import { FileInputNode } from "./FileInputNode";

export function PdfInputNode(props: NodeProps<FlowNode>) {
  return <FileInputNode {...props} accept=".pdf" nodeTypeName="PDF Input" />;
}
