import type { NodeTypes } from "@xyflow/react";

import { ConditionNode } from "@/components/nodes/ConditionNode";
import { DocxInputNode } from "@/components/nodes/DocxInputNode";
import { InputNode } from "@/components/nodes/InputNode";
import { JsonApiNode } from "@/components/nodes/JsonApiNode";
import { LLMNode } from "@/components/nodes/LLMNode";
import { NoteNode } from "@/components/nodes/NoteNode";
import { OutputNode } from "@/components/nodes/OutputNode";
import { PdfInputNode } from "@/components/nodes/PdfInputNode";
import { PptInputNode } from "@/components/nodes/PptInputNode";
import { PromptNode } from "@/components/nodes/PromptNode";
import { TransformNode } from "@/components/nodes/TransformNode";

export const nodeTypes = {
  input: InputNode,
  prompt: PromptNode,
  transform: TransformNode,
  condition: ConditionNode,
  llm: LLMNode,
  output: OutputNode,
  json_api: JsonApiNode,
  note: NoteNode,
  pdf_input: PdfInputNode,
  docx_input: DocxInputNode,
  ppt_input: PptInputNode,
} satisfies NodeTypes;
