"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type Viewport,
} from "@xyflow/react";
import { useCallback, type KeyboardEvent } from "react";

import { CanvasBanners } from "@/components/canvas/CanvasBanners";
import { Toolbar } from "@/components/canvas/Toolbar";
import { DebugPanel } from "@/components/debug/DebugPanel";
import { nodeTypes } from "@/components/nodes/nodeTypes";
import { usePipelineStore } from "@/store/pipelineStore";

export function FlowCanvas() {
  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const loadVersion = usePipelineStore((s) => s.loadVersion);
  const viewport = usePipelineStore((s) => s.viewport);
  const onNodesChange = usePipelineStore((s) => s.onNodesChange);
  const onEdgesChange = usePipelineStore((s) => s.onEdgesChange);
  const addEdge = usePipelineStore((s) => s.addEdge);

  const onMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, vp: Viewport) => {
      usePipelineStore.setState({ viewport: vp });
    },
    [],
  );

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
    }
  }, []);

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 overflow-hidden"
      onKeyDown={onKeyDown}
    >
      <Toolbar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <CanvasBanners />
        <div className="min-h-0 min-w-0 flex-1">
        <ReactFlow
          className="h-full w-full"
          key={`flow-${loadVersion}`}
          defaultViewport={viewport}
          deleteKeyCode={["Backspace", "Delete"]}
          edges={edges}
          nodeTypes={nodeTypes}
          nodes={nodes}
          onConnect={(c) => addEdge(c)}
          onEdgesChange={onEdgesChange}
          onMoveEnd={onMoveEnd}
          onNodesChange={onNodesChange}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} variant={BackgroundVariant.Dots} />
          <Controls position="bottom-left" />
          <MiniMap position="bottom-right" />
        </ReactFlow>
        </div>
      </div>
      <DebugPanel />
    </div>
  );
}
