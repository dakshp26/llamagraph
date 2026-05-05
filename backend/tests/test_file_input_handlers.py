"""Tests for pdf_input, docx_input, ppt_input node handlers and graph validation."""
import asyncio
from pathlib import Path
from unittest.mock import patch

import pytest

from backend.models.pipeline import EdgeModel, GraphPayload, NodeModel
from backend.services.executor import execute_pipeline
from backend.services.graph import validate_graph
from backend.services.node_handlers import HandlerCtx, NodeHandlerResult


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _make_ctx(node: NodeModel) -> HandlerCtx:
    return HandlerCtx(
        node=node,
        edges=[],
        context={},
        skipped=set(),
        order=[node.id],
        llm_fn=None,  # type: ignore[arg-type]
    )


async def _run_handler(node: NodeModel) -> NodeHandlerResult:
    from backend.services.node_handlers import NODE_HANDLERS, _FALLBACK_HANDLER
    import inspect

    ctx = _make_ctx(node)
    handler = NODE_HANDLERS.get(node.type.lower(), _FALLBACK_HANDLER)
    result = handler(ctx)
    if inspect.isasyncgen(result):
        async for _ in result:
            pass
    else:
        await result
    return ctx.result


# ---------------------------------------------------------------------------
# Handler: no filename
# ---------------------------------------------------------------------------

def test_pdf_handler_fatal_error_when_no_filename() -> None:
    node = NodeModel(id="n1", type="pdf_input", data={})
    result = asyncio.run(_run_handler(node))
    assert result.fatal_error is not None
    assert "No file selected" in result.fatal_error


def test_docx_handler_fatal_error_when_no_filename() -> None:
    node = NodeModel(id="n1", type="docx_input", data={})
    result = asyncio.run(_run_handler(node))
    assert result.fatal_error is not None
    assert "No file selected" in result.fatal_error


def test_ppt_handler_fatal_error_when_no_filename() -> None:
    node = NodeModel(id="n1", type="ppt_input", data={})
    result = asyncio.run(_run_handler(node))
    assert result.fatal_error is not None
    assert "No file selected" in result.fatal_error


# ---------------------------------------------------------------------------
# Handler: wrong extension
# ---------------------------------------------------------------------------

def test_pdf_handler_rejects_docx_extension() -> None:
    node = NodeModel(id="n1", type="pdf_input", data={"filename": "report.docx"})
    result = asyncio.run(_run_handler(node))
    assert result.fatal_error is not None
    assert ".docx" in result.fatal_error


def test_docx_handler_rejects_pdf_extension() -> None:
    node = NodeModel(id="n1", type="docx_input", data={"filename": "report.pdf"})
    result = asyncio.run(_run_handler(node))
    assert result.fatal_error is not None
    assert ".pdf" in result.fatal_error


def test_ppt_handler_rejects_docx_extension() -> None:
    node = NodeModel(id="n1", type="ppt_input", data={"filename": "notes.docx"})
    result = asyncio.run(_run_handler(node))
    assert result.fatal_error is not None
    assert ".docx" in result.fatal_error


def test_ppt_handler_accepts_pptx_extension() -> None:
    node = NodeModel(id="n1", type="ppt_input", data={"filename": "deck.pptx"})
    with patch(
        "backend.services.node_handlers.convert_file_to_markdown",
        return_value="# Slide",
    ):
        result = asyncio.run(_run_handler(node))
    assert result.fatal_error is None
    assert result.input_snapshot == "deck.pptx"


# ---------------------------------------------------------------------------
# Handler: file not found
# ---------------------------------------------------------------------------

def test_pdf_handler_fatal_error_when_file_missing() -> None:
    node = NodeModel(id="n1", type="pdf_input", data={"filename": "missing.pdf"})
    with patch(
        "backend.services.node_handlers.convert_file_to_markdown",
        side_effect=FileNotFoundError("missing.pdf"),
    ):
        result = asyncio.run(_run_handler(node))
    assert result.fatal_error is not None
    assert "not found" in result.fatal_error.lower()


# ---------------------------------------------------------------------------
# Handler: path traversal rejected
# ---------------------------------------------------------------------------

def test_pdf_handler_fatal_error_on_path_traversal() -> None:
    node = NodeModel(id="n1", type="pdf_input", data={"filename": "../etc/passwd"})
    result = asyncio.run(_run_handler(node))
    assert result.fatal_error is not None


# ---------------------------------------------------------------------------
# Handler: successful conversion
# ---------------------------------------------------------------------------

def test_pdf_handler_injects_markdown_into_context() -> None:
    import inspect as _inspect
    from backend.services.node_handlers import NODE_HANDLERS

    node = NodeModel(id="n1", type="pdf_input", data={"filename": "report.pdf"})
    ctx = _make_ctx(node)
    with patch(
        "backend.services.node_handlers.convert_file_to_markdown",
        return_value="# Report\n\nContent",
    ):
        coro_or_gen = NODE_HANDLERS["pdf_input"](ctx)
        if _inspect.isasyncgen(coro_or_gen):
            asyncio.run(_drain(coro_or_gen))
        else:
            asyncio.run(coro_or_gen)
    assert ctx.result.fatal_error is None
    assert ctx.context["n1"] == "# Report\n\nContent"
    assert ctx.result.input_snapshot == "report.pdf"


async def _drain(gen):
    async for _ in gen:
        pass


# ---------------------------------------------------------------------------
# Graph validation: file input nodes are source nodes
# ---------------------------------------------------------------------------

def test_pdf_input_accepted_as_source_in_validation() -> None:
    nodes = [
        NodeModel(id="src", type="pdf_input", data={"filename": "report.pdf"}),
        NodeModel(id="out", type="output", data={}),
    ]
    edges = [EdgeModel(id="e1", source="src", target="out")]
    payload = GraphPayload(nodes=nodes, edges=edges)
    issues = validate_graph(payload)
    assert not any("Input" in i.message for i in issues)


def test_docx_input_accepted_as_source_in_validation() -> None:
    nodes = [
        NodeModel(id="src", type="docx_input", data={"filename": "doc.docx"}),
        NodeModel(id="out", type="output", data={}),
    ]
    edges = [EdgeModel(id="e1", source="src", target="out")]
    payload = GraphPayload(nodes=nodes, edges=edges)
    issues = validate_graph(payload)
    assert not any("Input" in i.message for i in issues)


def test_ppt_input_accepted_as_source_in_validation() -> None:
    nodes = [
        NodeModel(id="src", type="ppt_input", data={"filename": "deck.pptx"}),
        NodeModel(id="out", type="output", data={}),
    ]
    edges = [EdgeModel(id="e1", source="src", target="out")]
    payload = GraphPayload(nodes=nodes, edges=edges)
    issues = validate_graph(payload)
    assert not any("Input" in i.message for i in issues)


# ---------------------------------------------------------------------------
# Graph validation: empty filename warning
# ---------------------------------------------------------------------------

def test_pdf_input_warns_when_filename_empty() -> None:
    nodes = [
        NodeModel(id="src", type="pdf_input", data={}),
        NodeModel(id="out", type="output", data={}),
    ]
    edges = [EdgeModel(id="e1", source="src", target="out")]
    payload = GraphPayload(nodes=nodes, edges=edges)
    issues = validate_graph(payload)
    assert any(i.node_id == "src" for i in issues)


def test_docx_input_warns_when_filename_empty() -> None:
    nodes = [
        NodeModel(id="src", type="docx_input", data={"filename": ""}),
        NodeModel(id="out", type="output", data={}),
    ]
    edges = [EdgeModel(id="e1", source="src", target="out")]
    payload = GraphPayload(nodes=nodes, edges=edges)
    issues = validate_graph(payload)
    assert any(i.node_id == "src" for i in issues)


def test_ppt_input_warns_when_filename_empty() -> None:
    nodes = [
        NodeModel(id="src", type="ppt_input", data={"filename": ""}),
        NodeModel(id="out", type="output", data={}),
    ]
    edges = [EdgeModel(id="e1", source="src", target="out")]
    payload = GraphPayload(nodes=nodes, edges=edges)
    issues = validate_graph(payload)
    assert any(i.node_id == "src" for i in issues)
