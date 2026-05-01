"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type NodeMouseHandler,
  type Viewport,
  type XYPosition,
} from "@xyflow/react";
import { useCallback, useState, type KeyboardEvent } from "react";

import { CanvasBanners } from "@/components/canvas/CanvasBanners";
import { ContextMenu } from "@/components/canvas/ContextMenu";
import { Toolbar } from "@/components/canvas/Toolbar";
import { DebugPanel } from "@/components/debug/DebugPanel";
import { nodeTypes } from "@/components/nodes/nodeTypes";
import { usePipelineStore } from "@/store/pipelineStore";
import type { FlowNode } from "@/types/pipeline";

interface CtxMenuState {
  x: number;
  y: number;
  flowPos: XYPosition;
  mode: "pane" | "node";
  nodeId?: string;
}

export function FlowCanvas() {
  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const loadVersion = usePipelineStore((s) => s.loadVersion);
  const viewport = usePipelineStore((s) => s.viewport);
  const onNodesChange = usePipelineStore((s) => s.onNodesChange);
  const onEdgesChange = usePipelineStore((s) => s.onEdgesChange);
  const addEdge = usePipelineStore((s) => s.addEdge);
  const addNode = usePipelineStore((s) => s.addNode);
  const focusNodeAndExpandDebugIo = usePipelineStore((s) => s.focusNodeAndExpandDebugIo);
  const copyNode = usePipelineStore((s) => s.copyNode);
  const pasteNode = usePipelineStore((s) => s.pasteNode);
  const clipboardNode = usePipelineStore((s) => s.clipboardNode);

  const { screenToFlowPosition } = useReactFlow();
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);

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

  const onNodeDoubleClick: NodeMouseHandler<FlowNode> = useCallback(
    (_event, node) => {
      focusNodeAndExpandDebugIo(node.id);
    },
    [focusNodeAndExpandDebugIo],
  );

  const onPaneContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      e.preventDefault();
      const x = Math.min(e.clientX, window.innerWidth - 160);
      const y = Math.min(e.clientY, window.innerHeight - 80);
      setCtxMenu({ x, y, flowPos: screenToFlowPosition({ x: e.clientX, y: e.clientY }), mode: "pane" });
    },
    [screenToFlowPosition],
  );

  const onNodeContextMenu: NodeMouseHandler<FlowNode> = useCallback(
    (e, node) => {
      e.preventDefault();
      const x = Math.min(e.clientX, window.innerWidth - 160);
      const y = Math.min(e.clientY, window.innerHeight - 80);
      setCtxMenu({
        x,
        y,
        flowPos: screenToFlowPosition({ x: e.clientX, y: e.clientY }),
        mode: "node",
        nodeId: node.id,
      });
    },
    [screenToFlowPosition],
  );

  const onPaneClick = useCallback(() => setCtxMenu(null), []);

  const onCtxAddNote = useCallback(() => {
    if (!ctxMenu) return;
    addNode("note", ctxMenu.flowPos);
    setCtxMenu(null);
  }, [ctxMenu, addNode]);

  const onCtxCopy = useCallback(() => {
    if (ctxMenu?.nodeId) copyNode(ctxMenu.nodeId);
    setCtxMenu(null);
  }, [ctxMenu, copyNode]);

  const onCtxPaste = useCallback(() => {
    if (!ctxMenu) return;
    pasteNode(ctxMenu.flowPos);
    setCtxMenu(null);
  }, [ctxMenu, pasteNode]);

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 overflow-hidden"
      onKeyDown={onKeyDown}
    >
      <Toolbar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <CanvasBanners />
        <div className="relative min-h-0 min-w-0 flex-1">
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
            onNodeContextMenu={onNodeContextMenu}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodesChange={onNodesChange}
            onPaneClick={onPaneClick}
            onPaneContextMenu={onPaneContextMenu}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} variant={BackgroundVariant.Dots} />
            <Controls position="bottom-left" />
            <MiniMap position="bottom-right" />
          </ReactFlow>
          {ctxMenu && (
            <ContextMenu
              hasClipboard={clipboardNode !== null}
              mode={ctxMenu.mode}
              x={ctxMenu.x}
              y={ctxMenu.y}
              onAddNote={onCtxAddNote}
              onClose={() => setCtxMenu(null)}
              onCopy={onCtxCopy}
              onPaste={onCtxPaste}
            />
          )}
        </div>
      </div>
      <DebugPanel />
    </div>
  );
}
