"use client";

import { formatValidationMessage } from "@/lib/formatValidationMessage";
import { useExecutionStore } from "@/store/executionStore";
import { useValidationStore } from "@/store/validationStore";

export function CanvasBanners() {
  const ollamaOnline = useValidationStore((s) => s.ollamaOnline);
  const graphValid = useValidationStore((s) => s.graphValid);
  const validationIssues = useValidationStore((s) => s.issues);
  const validationBannerDismissed = useValidationStore((s) => s.validationBannerDismissed);
  const dismissValidationBanner = useValidationStore((s) => s.dismissValidationBanner);
  const errors = useExecutionStore((s) => s.errors);
  const clearErrors = useExecutionStore((s) => s.clearErrors);

  const pipelineErrors = errors.filter((e) => !e.node_id);
  const showValidationBanner =
    !graphValid && validationIssues.length > 0 && !validationBannerDismissed;

  if (ollamaOnline && !showValidationBanner && pipelineErrors.length === 0) return null;

  return (
    <div className="flex shrink-0 flex-col">
      {!ollamaOnline ? (
        <div
          className="flex items-center gap-2 px-4 py-2"
          style={{
            background: "#0f0808",
            borderBottom: "1px solid #2a1010",
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 11,
          }}
        >
          <span style={{ color: "var(--panel-text-muted)" }}>{"// err"}</span>
          <span style={{ color: "#e05050" }}>
            ollama not running —{" "}
            <code
              style={{
                color: "#f87171",
                background: "#1a0808",
                padding: "1px 5px",
                borderRadius: 2,
                border: "1px solid #3a1010",
              }}
            >
              ollama serve
            </code>
          </span>
        </div>
      ) : null}

      {pipelineErrors.length > 0 ? (
        <div
          className="flex items-start gap-3 px-4 py-2"
          style={{
            background: "#0f0808",
            borderBottom: "1px solid #2a1010",
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 11,
          }}
          role="alert"
        >
          <span style={{ color: "var(--panel-text-muted)", flexShrink: 0 }}>{"// err"}</span>
          <div style={{ color: "#e05050", flex: 1, lineHeight: 1.5 }}>
            {pipelineErrors.map((e, i) => (
              <span key={`${e.node_id}-${i}`}>{e.message}</span>
            ))}
          </div>
          <button
            type="button"
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 11,
              color: "var(--panel-text-muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
              padding: 0,
            }}
            onClick={clearErrors}
          >
            [x]
          </button>
        </div>
      ) : null}

      {showValidationBanner ? (
        <div
          className="flex items-start gap-3 px-4 py-2"
          style={{
            background: "#0c0b00",
            borderBottom: "1px solid #252200",
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 11,
          }}
        >
          <span style={{ color: "var(--panel-text-muted)", flexShrink: 0 }}>{"// warn"}</span>
          <div style={{ color: "#c8a030", flex: 1, lineHeight: 1.5 }}>
            {validationIssues.map((issue, i) => (
              <span key={`${issue.node_id ?? "graph"}-${i}`}>
                {i > 0 && <span style={{ color: "var(--panel-text-muted)", margin: "0 4px" }}>·</span>}
                {formatValidationMessage(issue.message)}
              </span>
            ))}
          </div>
          <button
            type="button"
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 11,
              color: "var(--panel-text-muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
              padding: 0,
            }}
            onClick={() => dismissValidationBanner()}
          >
            [x]
          </button>
        </div>
      ) : null}
    </div>
  );
}
