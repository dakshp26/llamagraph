"use client";

import { ReactFlowProvider } from "@xyflow/react";

import { FlowCanvas } from "@/components/canvas/FlowCanvas";
import { PipelineValidationSync } from "@/components/canvas/PipelineValidationSync";
import { TopBar } from "@/components/canvas/TopBar";

export default function Home() {
  return (
    <ReactFlowProvider>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-neutral-100">
        <PipelineValidationSync />
        <TopBar />
        <div className="min-h-0 flex-1">
          <FlowCanvas />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
