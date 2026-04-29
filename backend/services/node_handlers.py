"""One handler per node type. To add a new node type:
1. Write an async handler function below.
2. Register it in NODE_HANDLERS.
The execute_pipeline loop never needs to change.
"""
from __future__ import annotations

import inspect
from collections.abc import AsyncIterator

import httpx
from dataclasses import dataclass, field
from typing import Any

from backend.models.pipeline import EdgeModel, NodeModel
from backend.services.graph import _prompt_template_text
from backend.services.pipeline_utils import (
    MAX_LLM_PROMPT_LENGTH,
    MAX_LLM_SYSTEM_PROMPT_LENGTH,
    GetModelsFn,
    LLMStreamFn,
    _assemble_from_incoming,
    _condition_matches,
    _forward_reachable,
    _friendly_llm_error,
    _norm_handle,
    _resolve_prompt_template,
    sse_event,
)
from backend.services.transform_ops import apply_transform_template, extract_json_field


@dataclass
class NodeHandlerResult:
    input_snapshot: str = ""
    condition_branch: str | None = None
    fatal_error: str | None = None


async def _no_model_check() -> list[str] | None:
    return None


@dataclass
class HandlerCtx:
    node: NodeModel
    edges: list[EdgeModel]
    context: dict[str, str]
    skipped: set[str]
    order: list[str]
    llm_fn: LLMStreamFn
    get_models_fn: GetModelsFn = field(default_factory=lambda: _no_model_check)
    result: NodeHandlerResult = field(default_factory=NodeHandlerResult)


# ---------------------------------------------------------------------------
# Individual handlers
# ---------------------------------------------------------------------------

async def _handle_input(ctx: HandlerCtx) -> None:
    raw = ctx.node.data.get("value")
    s = "" if raw is None else str(raw)
    ctx.context[ctx.node.id] = s
    ctx.result.input_snapshot = s


async def _handle_prompt(ctx: HandlerCtx) -> None:
    text = _prompt_template_text(ctx.node.data)
    ctx.result.input_snapshot = text
    ctx.context[ctx.node.id] = _resolve_prompt_template(
        text, ctx.node.id, ctx.edges, ctx.context, ctx.skipped
    )


async def _handle_transform(ctx: HandlerCtx) -> None:
    nid = ctx.node.id
    upstream = _assemble_from_incoming(nid, ctx.edges, ctx.context, ctx.order, ctx.skipped)
    ctx.result.input_snapshot = upstream
    mode = str(ctx.node.data.get("mode") or "extract")
    try:
        if mode == "template":
            tpl = str(ctx.node.data.get("template") or "")
            ctx.context[nid] = apply_transform_template(tpl, upstream)
        else:
            path = str(ctx.node.data.get("path") or "")
            ctx.context[nid] = extract_json_field(upstream, path)
    except ValueError as exc:
        ctx.result.fatal_error = str(exc)


async def _handle_condition(ctx: HandlerCtx) -> None:
    nid = ctx.node.id
    upstream = _assemble_from_incoming(nid, ctx.edges, ctx.context, ctx.order, ctx.skipped)
    ctx.result.input_snapshot = upstream
    pattern = str(ctx.node.data.get("pattern") or "")
    try:
        branch = "yes" if _condition_matches(pattern, upstream) else "no"
    except ValueError as exc:
        ctx.result.fatal_error = str(exc)
        return
    ctx.result.condition_branch = branch
    inactive = "no" if branch == "yes" else "yes"
    inactive_targets = {
        e.target
        for e in ctx.edges
        if e.source == nid and _norm_handle(e.source_handle) == inactive
    }
    active_targets = {
        e.target
        for e in ctx.edges
        if e.source == nid and _norm_handle(e.source_handle) == branch
    }
    ri = _forward_reachable(ctx.edges, inactive_targets)
    ra = _forward_reachable(ctx.edges, active_targets)
    ctx.skipped |= ri - ra
    ctx.context[nid] = upstream


async def _handle_llm(ctx: HandlerCtx) -> AsyncIterator[str]:
    nid = ctx.node.id
    prompt = _assemble_from_incoming(nid, ctx.edges, ctx.context, ctx.order, ctx.skipped)
    ctx.result.input_snapshot = prompt
    model = str(ctx.node.data.get("model") or "llama3.2")
    temperature_raw = ctx.node.data.get("temperature")
    temperature: float | None = float(temperature_raw) if temperature_raw is not None else None
    system_prompt_raw = ctx.node.data.get("systemPrompt")
    system_prompt: str | None = str(system_prompt_raw) if system_prompt_raw else None

    if len(prompt) > MAX_LLM_PROMPT_LENGTH:
        ctx.result.fatal_error = (
            f"Prompt is too long ({len(prompt):,} chars; limit is {MAX_LLM_PROMPT_LENGTH:,})."
        )
        return
    if system_prompt and len(system_prompt) > MAX_LLM_SYSTEM_PROMPT_LENGTH:
        ctx.result.fatal_error = (
            f"System prompt is too long ({len(system_prompt):,} chars;"
            f" limit is {MAX_LLM_SYSTEM_PROMPT_LENGTH:,})."
        )
        return

    available = await ctx.get_models_fn()
    if available is not None and model not in available:
        listed = ", ".join(available) if available else "none"
        ctx.result.fatal_error = (
            f'Model "{model}" is not available in Ollama. Available: {listed}.'
        )
        return

    parts: list[str] = []
    try:
        async for piece in ctx.llm_fn(
            model, prompt, temperature=temperature, system_prompt=system_prompt
        ):
            parts.append(piece)
            yield sse_event("token", {"node_id": nid, "content": piece})
    except Exception as exc:
        ctx.result.fatal_error = _friendly_llm_error(exc)
        return
    ctx.context[nid] = "".join(parts)


def _resolve_for_node(template: str, node_id: str, ctx: HandlerCtx) -> str:
    return _resolve_prompt_template(template, node_id, ctx.edges, ctx.context, ctx.skipped)


async def _handle_json_api(ctx: HandlerCtx) -> None:
    nid = ctx.node.id
    raw_url = str(ctx.node.data.get("url") or "")
    raw_params = ctx.node.data.get("params") or []
    raw_headers = ctx.node.data.get("headers") or []

    url = _resolve_for_node(raw_url, nid, ctx)
    params = {p["key"]: _resolve_for_node(p["value"], nid, ctx) for p in raw_params if p.get("key")}
    headers = {h["key"]: _resolve_for_node(h["value"], nid, ctx) for h in raw_headers if h.get("key")}

    ctx.result.input_snapshot = url
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, headers=headers, timeout=15)
    except httpx.TimeoutException:
        ctx.result.fatal_error = f"Request timed out after 15s ({url})."
        return
    except httpx.ConnectError:
        ctx.result.fatal_error = f"Could not connect to {url}."
        return
    except Exception as exc:
        ctx.result.fatal_error = f"Request failed: {type(exc).__name__}."
        return

    if not resp.is_success:
        ctx.result.fatal_error = f"API returned {resp.status_code} {resp.reason_phrase}."
        return

    body = resp.text
    if len(body) > 500_000:
        body = body[:500_000] + "\n[...response truncated at 500 KB]"
    ctx.context[nid] = body


async def _handle_output(ctx: HandlerCtx) -> None:
    nid = ctx.node.id
    up = _assemble_from_incoming(nid, ctx.edges, ctx.context, ctx.order, ctx.skipped)
    ctx.result.input_snapshot = up
    ctx.context[nid] = up


async def _handle_fallback(ctx: HandlerCtx) -> None:
    nid = ctx.node.id
    up = _assemble_from_incoming(nid, ctx.edges, ctx.context, ctx.order, ctx.skipped)
    ctx.result.input_snapshot = up
    ctx.context[nid] = up


# ---------------------------------------------------------------------------
# Registry — add new node types here
# ---------------------------------------------------------------------------

NODE_HANDLERS: dict[str, Any] = {
    "input": _handle_input,
    "prompt": _handle_prompt,
    "transform": _handle_transform,
    "condition": _handle_condition,
    "llm": _handle_llm,
    "output": _handle_output,
    "json_api": _handle_json_api,
}

_FALLBACK_HANDLER = _handle_fallback


async def dispatch_handler(ctx: HandlerCtx) -> AsyncIterator[str]:
    """Call the registered handler for ctx.node.type and yield any SSE events it produces."""
    handler = NODE_HANDLERS.get(ctx.node.type.lower(), _FALLBACK_HANDLER)
    result = handler(ctx)
    if inspect.isasyncgen(result):
        async for event in result:
            yield event
    else:
        await result
