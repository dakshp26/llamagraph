"use client";

import { useEffect, useRef } from "react";

import { getOllamaHealth, getOllamaModels, validatePipeline } from "@/lib/api";
import { usePipelineStore } from "@/store/pipelineStore";
import { useExecutionStore } from "@/store/executionStore";
import { useValidationStore } from "@/store/validationStore";
import { toGraphPayload } from "@/types/pipeline";

const DEBOUNCE_MS = 500;
const OLLAMA_POLL_MS = 10_000;

export function PipelineValidationSync() {
  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const setGraphValidation = useValidationStore((s) => s.setGraphValidation);
  const setOllamaOnline = useValidationStore((s) => s.setOllamaOnline);

  useEffect(() => {
    const tick = async () => {
      const health = await getOllamaHealth();
      setOllamaOnline(health.running);
      if (health.running) {
        try {
          const { models } = await getOllamaModels();
          useExecutionStore.getState().setOllamaModels(models);
        } catch {
          // leave existing model list in place if the fetch fails
        }
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), OLLAMA_POLL_MS);
    return () => window.clearInterval(id);
  }, [setOllamaOnline]);

  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(() => {
      const graph = toGraphPayload(nodes, edges);
      void validatePipeline(graph)
        .then((res) => {
          setGraphValidation(res.valid, res.errors);
        })
        .catch(() => {
          setGraphValidation(false, [
            {
              node_id: null,
              message: "Could not reach the validation service.",
            },
          ]);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [nodes, edges, setGraphValidation]);

  return null;
}
