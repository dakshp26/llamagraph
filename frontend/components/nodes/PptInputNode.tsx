"use client";

import type { NodeProps } from "@xyflow/react";
import type { FlowNode } from "@/types/pipeline";
import { FileInputNode } from "./FileInputNode";

export function PptInputNode(props: NodeProps<FlowNode>) {
  return <FileInputNode {...props} accept=".ppt,.pptx" nodeTypeName="PPT Input" />;
}
