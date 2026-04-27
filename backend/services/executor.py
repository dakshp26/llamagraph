from collections.abc import AsyncIterator
from typing import Any

from backend.models.pipeline import GraphPayload
from backend.services.graph import topological_sort
from backend.services.node_handlers import HandlerCtx, dispatch_handler
from backend.services.ollama_client import list_models, stream_chat
from backend.services.pipeline_utils import GetModelsFn, LLMStreamFn, sse_event


async def execute_pipeline(
    payload: GraphPayload,
    *,
    llm_stream: LLMStreamFn | None = None,
    get_models: GetModelsFn | None = None,
) -> AsyncIterator[str]:
    llm_fn = llm_stream or stream_chat
    models_fn = get_models or list_models
    nodes = payload.nodes
    edges = payload.edges
    node_by_id = {n.id: n for n in nodes}
    order = topological_sort(nodes, edges)
    context: dict[str, str] = {}
    skipped: set[str] = set()

    for nid in order:
        if nid in skipped:
            yield sse_event("node_status", {"node_id": nid, "status": "skipped"})
            continue

        node = node_by_id.get(nid)
        if node is None:
            continue

        yield sse_event("node_status", {"node_id": nid, "status": "pending"})

        ctx = HandlerCtx(
            node=node,
            edges=edges,
            context=context,
            skipped=skipped,
            order=order,
            llm_fn=llm_fn,
            get_models_fn=models_fn,
        )

        async for event in dispatch_handler(ctx):
            yield event

        if ctx.result.fatal_error:
            yield sse_event("error", {"message": ctx.result.fatal_error, "node_id": nid})
            yield sse_event("done", {})
            return

        done_payload: dict[str, Any] = {
            "node_id": nid,
            "status": "done",
            "value": context.get(nid, ""),
            "input": ctx.result.input_snapshot,
        }
        if ctx.result.condition_branch is not None:
            done_payload["branch"] = ctx.result.condition_branch
        yield sse_event("node_status", done_payload)

    yield sse_event("done", {})
