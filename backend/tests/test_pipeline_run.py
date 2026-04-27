import asyncio
import json
import re
from collections.abc import AsyncIterator
from unittest.mock import patch

from fastapi.testclient import TestClient

import backend.routers.pipeline as pipeline_router
from backend.main import app
from backend.routers.pipeline import MAX_CONCURRENT_RUNS, RUN_BUSY_MESSAGE


def _parse_sse(raw: str) -> list[tuple[str, dict]]:
    out: list[tuple[str, dict]] = []
    blocks = re.split(r"\n\n+", raw.strip())
    for block in blocks:
        if not block.strip():
            continue
        event = "message"
        data_line = ""
        for line in block.split("\n"):
            if line.startswith("event:"):
                event = line.split(":", 1)[1].strip()
            elif line.startswith("data:"):
                data_line = line.split(":", 1)[1].strip()
        if data_line:
            out.append((event, json.loads(data_line)))
    return out


def test_post_pipeline_run_returns_sse_stream() -> None:
    body = {
        "nodes": [
            {"id": "i", "type": "input", "data": {"value": "Hi"}},
            {"id": "l", "type": "llm", "data": {"model": "m"}},
            {"id": "o", "type": "output", "data": {}},
        ],
        "edges": [
            {"id": "e1", "source": "i", "target": "l"},
            {"id": "e2", "source": "l", "target": "o"},
        ],
    }

    async def fake_llm(_model: str, _prompt: str, **_kw: object) -> AsyncIterator[str]:
        yield "x"

    async def any_model() -> list[str] | None:
        return None

    with (
        patch("backend.services.executor.stream_chat", fake_llm),
        patch("backend.services.executor.list_models", any_model),
    ):
        client = TestClient(app)
        with client.stream("POST", "/pipeline/run", json=body) as r:
            assert r.status_code == 200
            assert "text/event-stream" in r.headers.get("content-type", "")
            text = r.read().decode()
    events = _parse_sse(text)
    assert any(t == "token" for t, _ in events)
    assert events[-1][0] == "done"


def test_post_pipeline_run_invalid_graph_sse_error() -> None:
    body = {
        "nodes": [
            {"id": "l", "type": "llm", "data": {}},
            {"id": "o", "type": "output", "data": {}},
        ],
        "edges": [{"id": "e1", "source": "l", "target": "o"}],
    }
    client = TestClient(app)
    with client.stream("POST", "/pipeline/run", json=body) as r:
        assert r.status_code == 200
        text = r.read().decode()
    events = _parse_sse(text)
    assert any(t == "error" for t, _ in events)
    assert events[-1][0] == "done"


_VALID_GRAPH_BODY = {
    "nodes": [
        {"id": "i", "type": "input", "data": {"value": "Hi"}},
        {"id": "l", "type": "llm", "data": {"model": "m"}},
        {"id": "o", "type": "output", "data": {}},
    ],
    "edges": [
        {"id": "e1", "source": "i", "target": "l"},
        {"id": "e2", "source": "l", "target": "o"},
    ],
}


def test_run_busy_when_max_concurrent_reached() -> None:
    with patch.object(pipeline_router, "_active_runs", MAX_CONCURRENT_RUNS):
        client = TestClient(app)
        with client.stream("POST", "/pipeline/run", json=_VALID_GRAPH_BODY) as r:
            assert r.status_code == 200
            text = r.read().decode()
    events = _parse_sse(text)
    assert any(t == "error" for t, _ in events)
    err = next(d for t, d in events if t == "error")
    assert err["message"] == RUN_BUSY_MESSAGE
    assert events[-1][0] == "done"


def test_run_guard_released_after_completion() -> None:
    async def fake_llm(_model: str, _prompt: str, **_kw: object) -> AsyncIterator[str]:
        yield "tok"

    async def any_model() -> list[str] | None:
        return None

    with (
        patch("backend.services.executor.stream_chat", fake_llm),
        patch("backend.services.executor.list_models", any_model),
    ):
        client = TestClient(app)
        with client.stream("POST", "/pipeline/run", json=_VALID_GRAPH_BODY) as r:
            r.read()

    assert pipeline_router._active_runs == 0


def test_run_timeout_emits_error_and_done() -> None:
    async def hanging_execute(
        _payload: object, **_kw: object
    ) -> AsyncIterator[str]:
        await asyncio.sleep(10)
        yield "unreachable"  # pragma: no cover

    with (
        patch("backend.routers.pipeline.execute_pipeline", hanging_execute),
        patch.object(pipeline_router, "RUN_TIMEOUT_SECONDS", 0.05),
    ):
        client = TestClient(app)
        with client.stream("POST", "/pipeline/run", json=_VALID_GRAPH_BODY) as r:
            assert r.status_code == 200
            text = r.read().decode()
    events = _parse_sse(text)
    assert any(t == "error" for t, _ in events)
    err = next(d for t, d in events if t == "error")
    assert "timed out" in err["message"].lower()
    assert events[-1][0] == "done"


def test_run_guard_released_on_timeout() -> None:
    async def hanging_execute(
        _payload: object, **_kw: object
    ) -> AsyncIterator[str]:
        await asyncio.sleep(10)
        yield "unreachable"  # pragma: no cover

    with (
        patch("backend.routers.pipeline.execute_pipeline", hanging_execute),
        patch.object(pipeline_router, "RUN_TIMEOUT_SECONDS", 0.05),
    ):
        client = TestClient(app)
        with client.stream("POST", "/pipeline/run", json=_VALID_GRAPH_BODY) as r:
            r.read()

    assert pipeline_router._active_runs == 0


def test_post_pipeline_run_unavailable_model_sse_error() -> None:
    body = {
        "nodes": [
            {"id": "i", "type": "input", "data": {"value": "hi"}},
            {"id": "l", "type": "llm", "data": {"model": "no-such-model"}},
            {"id": "o", "type": "output", "data": {}},
        ],
        "edges": [
            {"id": "e1", "source": "i", "target": "l"},
            {"id": "e2", "source": "l", "target": "o"},
        ],
    }

    async def fake_llm(_model: str, _prompt: str, **_kw: object) -> AsyncIterator[str]:
        yield "should not reach"

    async def known_models() -> list[str] | None:
        return ["llama3.2"]

    with (
        patch("backend.services.executor.stream_chat", fake_llm),
        patch("backend.services.executor.list_models", known_models),
    ):
        client = TestClient(app)
        with client.stream("POST", "/pipeline/run", json=body) as r:
            assert r.status_code == 200
            text = r.read().decode()
    events = _parse_sse(text)
    err = next(d for t, d in events if t == "error")
    assert "no-such-model" in err["message"]
    assert "not available" in err["message"].lower()
    assert events[-1][0] == "done"
