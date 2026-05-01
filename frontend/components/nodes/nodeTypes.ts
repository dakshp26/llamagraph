import type { NodeTypes } from "@xyflow/react";

import { ConditionNode } from "@/components/nodes/ConditionNode";
import { InputNode } from "@/components/nodes/InputNode";
import { JsonApiNode } from "@/components/nodes/JsonApiNode";
import { LLMNode } from "@/components/nodes/LLMNode";
import { OutputNode } from "@/components/nodes/OutputNode";
import { PromptNode } from "@/components/nodes/PromptNode";
import { NoteNode } from "@/components/nodes/NoteNode";
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
} satisfies NodeTypes;
