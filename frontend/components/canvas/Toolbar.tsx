"use client";

import { useReactFlow } from "@xyflow/react";
import { useCallback, useId, useState } from "react";
import type { NodeType } from "@/types/pipeline";
import { NODE_CATEGORIES, NODE_META } from "@/lib/nodeConfig";
import { readPaletteExpanded, RAIL, writePaletteExpanded } from "@/lib/uiChromeSession";
import { usePipelineStore } from "@/store/pipelineStore";

export function Toolbar() {
  const addNode = usePipelineStore((s) => s.addNode);
  const { screenToFlowPosition } = useReactFlow();
  const baseId = useId();
  const regionId = `${baseId}-palette`;

  const [expanded, setExpanded] = useState(() => readPaletteExpanded());

  const persist = useCallback((next: boolean) => {
    setExpanded(next);
    writePaletteExpanded(next);
  }, []);

  const addAtCanvasCenter = (type: NodeType) => {
    const flow = document.querySelector(".react-flow") as HTMLElement | null;
    const rect = flow?.getBoundingClientRect();
    if (!rect) {
      const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      addNode(type, screenToFlowPosition(center));
      return;
    }
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    addNode(type, screenToFlowPosition({ x: cx, y: cy }));
  };

  return (
    <nav
      aria-label="Add nodes"
      id={regionId}
      className="flex h-full min-h-0 shrink-0 flex-col overflow-hidden"
      style={{
        width: expanded ? RAIL.leftExpanded : RAIL.leftCollapsed,
        background: "var(--panel-bg)",
        borderRight: "1px solid var(--panel-border)",
      }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center"
        style={{
          padding: expanded ? "8px 10px 8px 12px" : "8px 6px",
          borderBottom: "1px solid var(--panel-border)",
          flexDirection: expanded ? "row" : "column",
          gap: 6,
          justifyContent: expanded ? "space-between" : "center",
        }}
      >
        {expanded ? (
          <span className="panel-label">nodes</span>
        ) : null}
        <button
          type="button"
          className="panel-toggle"
          aria-expanded={expanded}
          aria-controls={regionId}
          onClick={() => persist(!expanded)}
        >
          {expanded ? "‹" : "›"}
          <span className="sr-only">{expanded ? "Collapse palette" : "Expand palette"}</span>
        </button>
      </div>

      {/* Sectioned node list */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
        style={{ padding: expanded ? "8px 8px" : "8px 6px" }}
      >
        {NODE_CATEGORIES.map((section, si) => (
          <div key={section.label}>
            {/* Section separator / label */}
            {expanded ? (
              <div
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: 8,
                  color: "var(--panel-text-muted)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: si === 0 ? "0 2px 4px" : "8px 2px 4px",
                }}
              >
                {section.label}
              </div>
            ) : si > 0 ? (
              <div
                style={{
                  height: 1,
                  background: "var(--panel-border)",
                  margin: "6px 4px",
                }}
              />
            ) : null}

            {/* Items */}
            <ul
              className="list-none"
              style={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              {section.types.map((type) => {
                const meta = NODE_META[type];
                return (
                  <li key={type}>
                    {expanded ? (
                      <button
                        type="button"
                        className="toolbar-node-btn"
                        aria-label={`Add ${meta.label} node`}
                        onClick={() => addAtCanvasCenter(type)}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: 2,
                            height: 16,
                            borderRadius: 1,
                            background: meta.color,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: "var(--panel-text)", fontSize: 11 }}>
                          {meta.label}
                        </span>
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: 9,
                            letterSpacing: "0.1em",
                            color: "var(--panel-text-dim)",
                            fontWeight: 600,
                            fontFamily: "var(--font-geist-mono), monospace",
                          }}
                        >
                          {meta.abbr}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="toolbar-node-btn-collapsed"
                        aria-label={`Add ${meta.label}`}
                        onClick={() => addAtCanvasCenter(type)}
                        style={{ position: "relative", overflow: "hidden" }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 2,
                            background: meta.color,
                          }}
                        />
                        <span
                          aria-hidden
                          style={{
                            color: meta.color,
                            opacity: 0.75,
                            fontSize: 9,
                            letterSpacing: "0.08em",
                          }}
                        >
                          {meta.abbr}
                        </span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
