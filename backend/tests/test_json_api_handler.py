"""Tests for _handle_json_api and json_api validation in validate_graph."""
import asyncio
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from backend.models.pipeline import EdgeModel, GraphPayload, NodeModel
from backend.services.graph import validate_graph
from backend.services.node_handlers import HandlerCtx, NodeHandlerResult, _handle_json_api


def _make_ctx(
    node_id: str = "n1",
    url: str = "https://example.com/api",
    params: list | None = None,
    headers: list | None = None,
    context: dict | None = None,
    edges: list | None = None,
) -> HandlerCtx:
    async def _no_llm(*a, **kw):
        return
        yield  # make it async generator

    node = NodeModel(
        id=node_id,
        type="json_api",
        data={
            "url": url,
            "params": params or [],
            "headers": headers or [],
        },
    )
    return HandlerCtx(
        node=node,
        edges=edges or [],
        context=context or {},
        skipped=set(),
        order=[node_id],
        llm_fn=_no_llm,
        result=NodeHandlerResult(),
    )


def _run(ctx: HandlerCtx) -> None:
    asyncio.run(_handle_json_api(ctx))


def _patch_httpx(mock_resp=None, *, side_effect=None):
    """Patch httpx.AsyncClient so client.get returns mock_resp or raises side_effect."""
    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    if side_effect is not None:
        mock_client.get = AsyncMock(side_effect=side_effect)
    else:
        mock_client.get = AsyncMock(return_value=mock_resp)
    return patch("backend.services.node_handlers.httpx.AsyncClient", return_value=mock_client), mock_client


# ---------------------------------------------------------------------------
# Handler tests
# ---------------------------------------------------------------------------


def test_happy_path_body_stored_in_context() -> None:
    ctx = _make_ctx(url="https://example.com/data")
    mock_resp = MagicMock()
    mock_resp.is_success = True
    mock_resp.text = '{"hello": "world"}'
    (patcher, mock_client), _ = _patch_httpx(mock_resp), None
    with patcher:
        _run(ctx)
    mock_client.get.assert_called_once()
    assert ctx.context["n1"] == '{"hello": "world"}'
    assert ctx.result.fatal_error is None


def test_non_2xx_sets_fatal_error() -> None:
    ctx = _make_ctx(url="https://example.com/missing")
    mock_resp = MagicMock()
    mock_resp.is_success = False
    mock_resp.status_code = 404
    mock_resp.reason_phrase = "Not Found"
    patcher, _ = _patch_httpx(mock_resp)
    with patcher:
        _run(ctx)
    assert ctx.result.fatal_error is not None
    assert "404" in ctx.result.fatal_error


def test_timeout_sets_friendly_message() -> None:
    ctx = _make_ctx(url="https://slow.example.com")
    patcher, _ = _patch_httpx(side_effect=httpx.TimeoutException("timed out"))
    with patcher:
        _run(ctx)
    assert ctx.result.fatal_error is not None
    assert "timed out" in ctx.result.fatal_error.lower()


def test_connection_error_sets_friendly_message() -> None:
    ctx = _make_ctx(url="https://unreachable.example.com")
    patcher, _ = _patch_httpx(side_effect=httpx.ConnectError("failed"))
    with patcher:
        _run(ctx)
    assert ctx.result.fatal_error is not None
    assert "connect" in ctx.result.fatal_error.lower()


def test_response_over_500kb_is_truncated() -> None:
    ctx = _make_ctx(url="https://example.com/big")
    mock_resp = MagicMock()
    mock_resp.is_success = True
    mock_resp.text = "x" * 600_000
    patcher, _ = _patch_httpx(mock_resp)
    with patcher:
        _run(ctx)
    body = ctx.context["n1"]
    assert len(body) < 600_000
    assert "truncated" in body


def test_handle_in_param_value_resolved_from_context() -> None:
    ctx = _make_ctx(
        url="https://example.com/search",
        params=[{"key": "q", "value": "{{query}}"}],
        context={"upstream": "hello world"},
        edges=[
            EdgeModel(
                id="e1",
                source="upstream",
                target="n1",
                targetHandle="query",
            )
        ],
    )
    mock_resp = MagicMock()
    mock_resp.is_success = True
    mock_resp.text = "ok"
    patcher, mock_client = _patch_httpx(mock_resp)
    with patcher:
        _run(ctx)
    _, kwargs = mock_client.get.call_args
    assert kwargs["params"]["q"] == "hello world"


def test_empty_key_rows_not_passed_to_httpx() -> None:
    ctx = _make_ctx(
        url="https://example.com/api",
        params=[
            {"key": "", "value": "ignored"},
            {"key": "keep", "value": "yes"},
        ],
        headers=[{"key": "", "value": "also ignored"}],
    )
    mock_resp = MagicMock()
    mock_resp.is_success = True
    mock_resp.text = "ok"
    patcher, mock_client = _patch_httpx(mock_resp)
    with patcher:
        _run(ctx)
    _, kwargs = mock_client.get.call_args
    assert "" not in kwargs["params"]
    assert "keep" in kwargs["params"]
    assert kwargs["headers"] == {}


# ---------------------------------------------------------------------------
# validate_graph tests for json_api nodes
# ---------------------------------------------------------------------------


def _graph(nodes, edges=None):
    return GraphPayload(nodes=nodes, edges=edges or [])


def test_json_api_only_source_is_valid() -> None:
    payload = _graph(
        nodes=[
            NodeModel(id="j", type="json_api", data={"url": "https://example.com", "params": [], "headers": []}),
            NodeModel(id="o", type="output", data={}),
        ],
        edges=[EdgeModel(id="e1", source="j", target="o")],
    )
    errors = validate_graph(payload)
    assert not any("Input" in e.message or "JSON API" in e.message for e in errors if e.node_id is None), \
        f"Should not require an Input node, errors: {errors}"


def test_json_api_empty_url_triggers_error() -> None:
    payload = _graph(
        nodes=[
            NodeModel(id="j", type="json_api", data={"url": "", "params": [], "headers": []}),
            NodeModel(id="o", type="output", data={}),
        ],
        edges=[EdgeModel(id="e1", source="j", target="o")],
    )
    errors = validate_graph(payload)
    assert any(e.node_id == "j" and "URL" in e.message for e in errors)


def test_json_api_bad_scheme_triggers_error() -> None:
    payload = _graph(
        nodes=[
            NodeModel(id="j", type="json_api", data={"url": "ftp://example.com", "params": [], "headers": []}),
            NodeModel(id="o", type="output", data={}),
        ],
        edges=[EdgeModel(id="e1", source="j", target="o")],
    )
    errors = validate_graph(payload)
    assert any(e.node_id == "j" and "http" in e.message.lower() for e in errors)


def test_json_api_missing_handle_edge_triggers_error() -> None:
    payload = _graph(
        nodes=[
            NodeModel(id="j", type="json_api", data={"url": "https://{{host}}/api", "params": [], "headers": []}),
            NodeModel(id="o", type="output", data={}),
        ],
        edges=[EdgeModel(id="e1", source="j", target="o")],
    )
    errors = validate_graph(payload)
    assert any(e.node_id == "j" and "host" in e.message for e in errors)


def test_json_api_handle_wired_correctly_is_valid() -> None:
    payload = _graph(
        nodes=[
            NodeModel(id="i", type="input", data={"value": "api.example.com"}),
            NodeModel(id="j", type="json_api", data={"url": "https://{{host}}/data", "params": [], "headers": []}),
            NodeModel(id="o", type="output", data={}),
        ],
        edges=[
            EdgeModel(id="e1", source="i", target="j", targetHandle="host"),
            EdgeModel(id="e2", source="j", target="o"),
        ],
    )
    errors = validate_graph(payload)
    assert not any(e.node_id == "j" for e in errors)
