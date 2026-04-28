"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { orderNodes, topologicalNodeIds } from "@/lib/graphOrder";
import { NODE_CATEGORIES, nodeColor } from "@/lib/nodeConfig";
import { readDebugExpanded, RAIL, writeDebugExpanded } from "@/lib/uiChromeSession";
import { useExecutionStore } from "@/store/executionStore";
import { usePipelineStore } from "@/store/pipelineStore";
import type { FlowNode } from "@/types/pipeline";
import { DebugIoExpandOverlay } from "./DebugIoExpandOverlay";
import { NodeIoPane } from "./NodeIoPane";

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function nodeInfoLines(n: FlowNode): string[] {
  const d = n.data as Record<string, unknown>;
  switch (n.type) {
    case "input":
      return [`value: "${truncate(String(d.value ?? ""), 32) || "(empty)"}"`];
    case "prompt":
      return [`template: "${truncate(String(d.template ?? ""), 30) || "(empty)"}"`];
    case "transform": {
      const mode = String(d.mode ?? "extract");
      return mode === "extract"
        ? [`mode: extract`, `path: ${String(d.path || "(all)")}`]
        : [`mode: template`, `tpl: "${truncate(String(d.template ?? ""), 26) || "(empty)"}"`];
    }
    case "condition":
      return [`pattern: "${truncate(String(d.pattern ?? ""), 32) || "(empty)"}"`];
    case "llm":
      return [
        `model: ${String(d.model || "—")}`,
        `temp: ${Number(d.temperature ?? 0).toFixed(1)}`,
      ];
    case "output":
      return ["(no config)"];
    default:
      return [];
  }
}

export function DebugPanel() {
  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const focusNode = usePipelineStore((s) => s.focusNode);
  const debugIoExpandGeneration = usePipelineStore((s) => s.debugIoExpandGeneration);
  const baseId = useId();
  const regionId = `${baseId}-debug`;
  const artifacts = useExecutionStore((s) => s.nodeRunArtifacts);

  const [expanded, setExpanded] = useState(() => readDebugExpanded());
  const [ioExpandOpen, setIoExpandOpen] = useState(false);
  const [hovered, setHovered] = useState<{ id: string; rect: DOMRect } | null>(null);

  const persist = useCallback((next: boolean) => {
    setExpanded(next);
    writeDebugExpanded(next);
  }, []);

  const selected = useMemo(() => nodes.find((n) => n.selected) ?? null, [nodes]);
  const countSelected = useMemo(() => nodes.filter((n) => n.selected).length, [nodes]);
  const orderedIds = useMemo(() => topologicalNodeIds(nodes, edges), [nodes, edges]);
  const ordered = useMemo(() => orderNodes(nodes, edges), [nodes, edges]);
  const idOrder = useMemo(() => {
    const m = new Map(orderedIds.map((id, i) => [id, i]));
    return m;
  }, [orderedIds]);

  const hoveredNode = hovered ? (nodes.find((n) => n.id === hovered.id) ?? null) : null;

  const prevDebugExpandGen = useRef(debugIoExpandGeneration);

  useEffect(() => {
    if (!expanded) setIoExpandOpen(false);
  }, [expanded]);

  useEffect(() => {
    if (debugIoExpandGeneration === prevDebugExpandGen.current) return;
    prevDebugExpandGen.current = debugIoExpandGeneration;
    if (debugIoExpandGeneration > 0) {
      setIoExpandOpen(true);
      persist(true);
    }
  }, [debugIoExpandGeneration, persist]);

  return (
    <aside
      aria-label="Node debug and I/O"
      id={regionId}
      className="flex h-full min-h-0 shrink-0 flex-col overflow-hidden"
      style={{
        width: expanded ? RAIL.rightExpanded : RAIL.rightCollapsed,
        maxWidth: "min(100vw, 360px)",
        background: "var(--panel-bg)",
        borderLeft: "1px solid var(--panel-accent-border)",
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
          <span className="panel-label">debug</span>
        ) : null}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {expanded ? (
            <button
              type="button"
              className="panel-toggle"
              aria-haspopup="dialog"
              aria-expanded={ioExpandOpen}
              aria-controls={`${regionId}-io-expand`}
              title="Expand I/O view"
              onClick={() => setIoExpandOpen(true)}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M15 3h6v6M10 14 21 3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="sr-only">Open expanded I/O view</span>
            </button>
          ) : null}
          <button
            type="button"
            className="panel-toggle"
            aria-expanded={expanded}
            aria-controls={regionId}
            onClick={() => persist(!expanded)}
          >
            {expanded ? "›" : "‹"}
            <span className="sr-only">{expanded ? "Collapse debug panel" : "Expand debug panel"}</span>
          </button>
        </div>
      </div>

      {expanded ? (
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          style={{ padding: "12px 12px", gap: 12 }}
        >
          {/* Multi-select notice */}
          {countSelected > 1 ? (
            <p
              role="status"
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 10,
                color: "var(--panel-text-dim)",
                flexShrink: 0,
              }}
            >
              <span style={{ color: "var(--panel-text-muted)" }}>{"// "}</span>
              {countSelected} nodes selected — showing first
            </p>
          ) : null}

          {/* Sectioned node list */}
          {nodes.length > 0 ? (
            <div style={{ flexShrink: 0 }}>
              <div className="panel-rule" style={{ marginBottom: 8 }}>
                nodes
              </div>
              <div
                className="overflow-y-auto"
                style={{ maxHeight: 160, display: "flex", flexDirection: "column", gap: 8 }}
              >
                {NODE_CATEGORIES.map((section) => {
                  const sectionNodes = ordered.filter((n) => section.types.includes(n.type as never));
                  if (sectionNodes.length === 0) return null;
                  return (
                    <div key={section.label}>
                      <div
                        style={{
                          fontFamily: "var(--font-geist-mono), monospace",
                          fontSize: 8,
                          color: "var(--panel-text-muted)",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          marginBottom: 3,
                          paddingLeft: 2,
                        }}
                      >
                        {section.label}
                      </div>
                      <ul
                        className="list-none"
                        style={{ display: "flex", flexDirection: "column", gap: 1 }}
                      >
                        {sectionNodes.map((n) => {
                          const o = idOrder.get(n.id) ?? 0;
                          const isSelected = selected?.id === n.id;
                          const color = nodeColor(n.type);
                          return (
                            <li key={n.id}>
                              <button
                                type="button"
                                className={`debug-node-item${isSelected ? " selected" : ""}`}
                                onClick={() => focusNode(n.id)}
                                onMouseEnter={(e) =>
                                  setHovered({ id: n.id, rect: e.currentTarget.getBoundingClientRect() })
                                }
                                onMouseLeave={() => setHovered(null)}
                              >
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: 2,
                                    height: 12,
                                    borderRadius: 1,
                                    background: isSelected ? "var(--panel-accent)" : color,
                                    opacity: isSelected ? 1 : 0.6,
                                    flexShrink: 0,
                                  }}
                                />
                                <span style={{ color: "var(--panel-text-muted)", fontSize: 9 }}>
                                  {o + 1}.
                                </span>
                                <span>{n.type}</span>
                                <span
                                  style={{
                                    color: "var(--panel-text-muted)",
                                    fontSize: 9,
                                    marginLeft: 2,
                                  }}
                                >
                                  {n.id.slice(0, 6)}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* IO pane */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <NodeIoPane
              artifact={selected ? artifacts[selected.id] : undefined}
              node={selected}
            />
          </div>
        </div>
      ) : null}

      {/* Hover tooltip — fixed so it escapes overflow:hidden */}
      {hoveredNode && hovered ? (
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: Math.min(
              hovered.rect.top,
              typeof window !== "undefined" ? window.innerHeight - 120 : hovered.rect.top,
            ),
            right:
              typeof window !== "undefined" ? window.innerWidth - hovered.rect.left + 8 : 0,
            zIndex: 9999,
            background: "var(--panel-card)",
            border: "1px solid var(--panel-border-hover)",
            borderRadius: 4,
            padding: "6px 8px",
            minWidth: 140,
            maxWidth: 200,
            pointerEvents: "none",
            boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 10,
              color: nodeColor(hoveredNode.type),
              fontWeight: 600,
              letterSpacing: "0.04em",
              marginBottom: 4,
            }}
          >
            {hoveredNode.type}
            <span
              style={{
                color: "var(--panel-text-muted)",
                fontWeight: 400,
                fontSize: 8,
                marginLeft: 6,
              }}
            >
              {hoveredNode.id.slice(0, 8)}
            </span>
          </div>
          {nodeInfoLines(hoveredNode).map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 9,
                color: "var(--panel-text-dim)",
                letterSpacing: "0.02em",
                lineHeight: 1.6,
              }}
            >
              {line}
            </div>
          ))}
        </div>
      ) : null}

      <DebugIoExpandOverlay
        dialogId={`${regionId}-io-expand`}
        open={ioExpandOpen}
        onClose={() => setIoExpandOpen(false)}
        node={selected}
        artifact={selected ? artifacts[selected.id] : undefined}
      />
    </aside>
  );
}
