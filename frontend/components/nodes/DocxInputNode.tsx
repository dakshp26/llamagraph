"use client";

import type { NodeProps } from "@xyflow/react";
import type { FlowNode } from "@/types/pipeline";
import { FileInputNode } from "./FileInputNode";

export function DocxInputNode(props: NodeProps<FlowNode>) {
  return <FileInputNode {...props} accept=".docx" nodeTypeName="DOCX Input" />;
}
