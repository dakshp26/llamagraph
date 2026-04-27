import asyncio
import json
import re
from collections.abc import AsyncIterator

from backend.models.pipeline import EdgeModel, GraphPayload, NodeModel
from backend.services.executor import execute_pipeline


def _parse_sse(raw: str) -> list[tuple[str, dict]]:
    """Parse minimal SSE text into (event_type, data_dict) pairs."""
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


async def _collect_sse(payload: GraphPayload, llm_stream) -> str:
    parts: list[str] = []
    async def no_models() -> list[str] | None:
        return None
    async for line in execute_pipeline(payload, llm_stream=llm_stream, get_models=no_models):
        parts.append(line)
    return "".join(parts)


def test_executor_input_llm_output_streams_tokens_and_status() -> None:
    nodes = [
        NodeModel(id="i", type="input", data={"value": "Say hi"}),
        NodeModel(id="l", type="llm", data={"model": "test-model"}),
        NodeModel(id="o", type="output", data={}),
    ]
    edges = [
        EdgeModel(id="e1", source="i", target="l"),
        EdgeModel(id="e2", source="l", target="o"),
    ]
    payload = GraphPayload(nodes=nodes, edges=edges)

    async def fake_llm(_model: str, _prompt: str, **_kw: object) -> AsyncIterator[str]:
        yield "Hel"
        yield "lo"

    raw = asyncio.run(_collect_sse(payload, fake_llm))
    events = _parse_sse(raw)

    types = [e[0] for e in events]
    assert "node_status" in types
    assert "token" in types
    assert "done" in types

    statuses = [d for t, d in events if t == "node_status"]
    assert any(d == {"node_id": "i", "status": "pending"} for d in statuses)
    assert any(d.get("node_id") == "i" and d.get("status") == "done" for d in statuses)
    assert any(d == {"node_id": "l", "status": "pending"} for d in statuses)
    assert any(d.get("node_id") == "l" and d.get("status") == "done" for d in statuses)
    assert any(d == {"node_id": "o", "status": "pending"} for d in statuses)
    done_o = next(d for d in statuses if d.get("node_id") == "o" and d.get("status") == "done")
    assert done_o.get("value") == "Hello"

    tokens = [d for t, d in events if t == "token"]
    assert tokens == [
        {"node_id": "l", "content": "Hel"},
        {"node_id": "l", "content": "lo"},
    ]


def test_executor_llm_failure_emits_error_and_done() -> None:
    nodes = [
        NodeModel(id="i", type="input", data={"value": "x"}),
        NodeModel(id="l", type="llm", data={}),
        NodeModel(id="o", type="output", data={}),
    ]
    edges = [
        EdgeModel(id="e1", source="i", target="l"),
        EdgeModel(id="e2", source="l", target="o"),
    ]
    payload = GraphPayload(nodes=nodes, edges=edges)

    async def boom(_model: str, _prompt: str, **_kw: object) -> AsyncIterator[str]:
        raise ConnectionError("Ollama is not reachable")
        yield ""  # pragma: no cover

    raw = asyncio.run(_collect_sse(payload, boom))
    events = _parse_sse(raw)
    assert any(t == "error" for t, _ in events)
    err = next(d for t, d in events if t == "error")
    assert "message" in err
    assert "reachable" in err["message"].lower() or "ollama" in err["message"].lower()
    assert events[-1][0] == "done"


def test_executor_two_runs_use_isolated_context() -> None:
    async def fake_llm(_model: str, prompt: str, **_kw: object) -> AsyncIterator[str]:
        yield prompt

    def output_value(sse_raw: str) -> str:
        events = _parse_sse(sse_raw)
        done_o = next(
            d
            for t, d in events
            if t == "node_status"
            and d.get("node_id") == "o"
            and d.get("status") == "done"
        )
        return str(done_o.get("value", ""))

    p1 = GraphPayload(
        nodes=[
            NodeModel(id="i", type="input", data={"value": "A"}),
            NodeModel(id="l", type="llm", data={}),
            NodeModel(id="o", type="output", data={}),
        ],
        edges=[
            EdgeModel(id="e1", source="i", target="l"),
            EdgeModel(id="e2", source="l", target="o"),
        ],
    )
    p2 = GraphPayload(
        nodes=[
            NodeModel(id="i", type="input", data={"value": "B"}),
            NodeModel(id="l", type="llm", data={}),
            NodeModel(id="o", type="output", data={}),
        ],
        edges=[
            EdgeModel(id="e1", source="i", target="l"),
            EdgeModel(id="e2", source="l", target="o"),
        ],
    )

    async def both() -> tuple[str, str]:
        return await asyncio.gather(
            _collect_sse(p1, fake_llm),
            _collect_sse(p2, fake_llm),
        )

    r1, r2 = asyncio.run(both())
    assert output_value(r1) == "A"
    assert output_value(r2) == "B"


def test_executor_prompt_resolves_placeholders() -> None:
    nodes = [
        NodeModel(id="i", type="input", data={"value": "Ada"}),
        NodeModel(
            id="p",
            type="prompt",
            data={"template": "Hello {{name}}"},
        ),
        NodeModel(id="l", type="llm", data={}),
        NodeModel(id="o", type="output", data={}),
    ]
    edges = [
        EdgeModel(id="e1", source="i", target="p", target_handle="name"),
        EdgeModel(id="e2", source="p", target="l"),
        EdgeModel(id="e3", source="l", target="o"),
    ]
    payload = GraphPayload(nodes=nodes, edges=edges)
    seen_prompt: list[str] = []

    async def capture_llm(_model: str, prompt: str, **_kw: object) -> AsyncIterator[str]:
        seen_prompt.append(prompt)
        yield "ok"

    raw = asyncio.run(_collect_sse(payload, capture_llm))
    assert seen_prompt == ["Hello Ada"]
    events = _parse_sse(raw)
    done_o = next(
        d
        for t, d in events
        if t == "node_status"
        and d.get("node_id") == "o"
        and d.get("status") == "done"
    )
    assert done_o.get("value") == "ok"


def test_executor_transform_extract_json_path() -> None:
    nodes = [
        NodeModel(id="i", type="input", data={"value": '{"user": {"name": "Alice"}}'}),
        NodeModel(id="t", type="transform", data={"mode": "extract", "path": "user.name"}),
        NodeModel(id="o", type="output", data={}),
    ]
    edges = [
        EdgeModel(id="e1", source="i", target="t"),
        EdgeModel(id="e2", source="t", target="o"),
    ]
    payload = GraphPayload(nodes=nodes, edges=edges)

    async def no_llm(_model: str, _prompt: str, **_kw: object) -> AsyncIterator[str]:
        yield ""  # pragma: no cover

    raw = asyncio.run(_collect_sse(payload, no_llm))
    events = _parse_sse(raw)
    done_o = next(
        d
        for t, d in events
        if t == "node_status" and d.get("node_id") == "o" and d.get("status") == "done"
    )
    assert done_o.get("value") == "Alice"


def test_executor_transform_template_mode() -> None:
    nodes = [
        NodeModel(id="i", type="input", data={"value": "World"}),
        NodeModel(
            id="t",
            type="transform",
            data={"mode": "template", "template": "Hello {{input}}!"},
        ),
        NodeModel(id="o", type="output", data={}),
    ]
    edges = [
        EdgeModel(id="e1", source="i", target="t"),
        EdgeModel(id="e2", source="t", target="o"),
    ]
    payload = GraphPayload(nodes=nodes, edges=edges)

    async def no_llm(_model: str, _prompt: str, **_kw: object) -> AsyncIterator[str]:
        yield ""

    raw = asyncio.run(_collect_sse(payload, no_llm))
    events = _parse_sse(raw)
    done_o = next(
        d
        for t, d in events
        if t == "node_status" and d.get("node_id") == "o" and d.get("status") == "done"
    )
    assert done_o.get("value") == "Hello World!"


def test_executor_transform_invalid_json_emits_error() -> None:
    nodes = [
        NodeModel(id="i", type="input", data={"value": "plain"}),
        NodeModel(id="t", type="transform", data={"mode": "extract", "path": "x"}),
        NodeModel(id="o", type="output", data={}),
    ]
    edges = [
        EdgeModel(id="e1", source="i", target="t"),
        EdgeModel(id="e2", source="t", target="o"),
    ]
    payload = GraphPayload(nodes=nodes, edges=edges)

    async def no_llm(_model: str, _prompt: str, **_kw: object) -> AsyncIterator[str]:
        yield ""

    raw = asyncio.run(_collect_sse(payload, no_llm))
    events = _parse_sse(raw)
    err = next(d for t, d in events if t == "error")
    assert "json" in err.get("message", "").lower()
    assert events[-1][0] == "done"


def test_executor_condition_keyword_yes_skips_no_branch_output() -> None:
    nodes = [
        NodeModel(id="i", type="input", data={"value": "An error occurred"}),
        NodeModel(id="c", type="condition", data={"pattern": "error"}),
        NodeModel(id="oy", type="output", data={}),
        NodeModel(id="on", type="output", data={}),
    ]
    edges = [
        EdgeModel(id="e1", source="i", target="c"),
        EdgeModel(id="e2", source="c", target="oy", source_handle="yes"),
        EdgeModel(id="e3", source="c", target="on", source_handle="no"),
    ]
    payload = GraphPayload(nodes=nodes, edges=edges)

    async def no_llm(_model: str, _prompt: str, **_kw: object) -> AsyncIterator[str]:
        yield ""

    raw = asyncio.run(_collect_sse(payload, no_llm))
    events = _parse_sse(raw)
    statuses = [d for t, d in events if t == "node_status"]
    assert any(d == {"node_id": "on", "status": "skipped"} for d in statuses)
    done_yes = next(d for d in statuses if d.get("node_id") == "oy" and d.get("status") == "done")
    assert done_yes.get("value") == "An error occurred"
    done_c = next(d for d in statuses if d.get("node_id") == "c" and d.get("status") == "done")
    assert done_c.get("branch") == "yes"


def test_executor_condition_regex_routes_yes_and_no() -> None:
    def run_with_input(value: str) -> str:
        nodes = [
            NodeModel(id="i", type="input", data={"value": value}),
            NodeModel(id="c", type="condition", data={"pattern": r"/^\d+$/"}),
            NodeModel(id="oy", type="output", data={}),
            NodeModel(id="on", type="output", data={}),
        ]
        edges = [
            EdgeModel(id="e1", source="i", target="c"),
            EdgeModel(id="e2", source="c", target="oy", source_handle="yes"),
            EdgeModel(id="e3", source="c", target="on", source_handle="no"),
        ]
        payload = GraphPayload(nodes=nodes, edges=edges)

        async def no_llm(_model: str, _prompt: str, **_kw: object) -> AsyncIterator[str]:
            yield ""

        return asyncio.run(_collect_sse(payload, no_llm))

    raw123 = run_with_input("123")
    events123 = _parse_sse(raw123)
    st123 = [d for t, d in events123 if t == "node_status"]
    assert next(d for d in st123 if d.get("node_id") == "c" and d.get("status") == "done").get(
        "branch"
    ) == "yes"
    assert any(d.get("node_id") == "on" and d.get("status") == "skipped" for d in st123)

    raw_abc = run_with_input("abc")
    events_abc = _parse_sse(raw_abc)
    st_abc = [d for t, d in events_abc if t == "node_status"]
    assert next(d for d in st_abc if d.get("node_id") == "c" and d.get("status") == "done").get(
        "branch"
    ) == "no"
    assert any(d.get("node_id") == "oy" and d.get("status") == "skipped" for d in st_abc)


def test_executor_condition_unsafe_regex_emits_error_and_done() -> None:
    nodes = [
        NodeModel(id="i", type="input", data={"value": "aaaa"}),
        NodeModel(id="c", type="condition", data={"pattern": r"/(a+)+$/"}),
        NodeModel(id="oy", type="output", data={}),
        NodeModel(id="on", type="output", data={}),
    ]
    edges = [
        EdgeModel(id="e1", source="i", target="c"),
        EdgeModel(id="e2", source="c", target="oy", source_handle="yes"),
        EdgeModel(id="e3", source="c", target="on", source_handle="no"),
    ]
    payload = GraphPayload(nodes=nodes, edges=edges)

    async def no_llm(_model: str, _prompt: str, **_kw: object) -> AsyncIterator[str]:
        yield ""

    raw = asyncio.run(_collect_sse(payload, no_llm))
    events = _parse_sse(raw)
    err = next(d for t, d in events if t == "error")
    assert err == {
        "message": "Regex pattern is too complex.",
        "node_id": "c",
    }
    assert events[-1][0] == "done"


# ---------------------------------------------------------------------------
# Task 7: LLM field size and model validation
# ---------------------------------------------------------------------------

async def _collect_sse_with_models(
    payload: GraphPayload,
    llm_stream,
    get_models,
) -> str:
    parts: list[str] = []
    async for line in execute_pipeline(payload, llm_stream=llm_stream, get_models=get_models):
        parts.append(line)
    return "".join(parts)


def _make_llm_payload(prompt_value: str, model: str = "test-model") -> GraphPayload:
    return GraphPayload(
        nodes=[
            NodeModel(id="i", type="input", data={"value": prompt_value}),
            NodeModel(id="l", type="llm", data={"model": model}),
            NodeModel(id="o", type="output", data={}),
        ],
        edges=[
            EdgeModel(id="e1", source="i", target="l"),
            EdgeModel(id="e2", source="l", target="o"),
        ],
    )


def test_executor_llm_prompt_too_long_emits_error() -> None:
    long_prompt = "x" * 50_001
    payload = _make_llm_payload(long_prompt)

    async def fake_llm(_model: str, _prompt: str, **_kw: object) -> AsyncIterator[str]:
        yield "should not reach"

    async def no_models() -> list[str] | None:
        return None

    raw = asyncio.run(_collect_sse_with_models(payload, fake_llm, no_models))
    events = _parse_sse(raw)
    err = next(d for t, d in events if t == "error")
    assert "too long" in err["message"].lower()
    assert "50,000" in err["message"] or "50001" in err["message"] or "50,001" in err["message"]
    assert events[-1][0] == "done"


def test_executor_llm_system_prompt_too_long_emits_error() -> None:
    payload = GraphPayload(
        nodes=[
            NodeModel(id="i", type="input", data={"value": "hi"}),
            NodeModel(
                id="l",
                type="llm",
                data={"model": "test-model", "systemPrompt": "s" * 20_001},
            ),
            NodeModel(id="o", type="output", data={}),
        ],
        edges=[
            EdgeModel(id="e1", source="i", target="l"),
            EdgeModel(id="e2", source="l", target="o"),
        ],
    )

    async def fake_llm(_model: str, _prompt: str, **_kw: object) -> AsyncIterator[str]:
        yield "should not reach"

    async def no_models() -> list[str] | None:
        return None

    raw = asyncio.run(_collect_sse_with_models(payload, fake_llm, no_models))
    events = _parse_sse(raw)
    err = next(d for t, d in events if t == "error")
    assert "too long" in err["message"].lower()
    assert "system" in err["message"].lower()
    assert events[-1][0] == "done"


def test_executor_llm_unavailable_model_emits_error() -> None:
    payload = _make_llm_payload("hello", model="missing-model")

    async def fake_llm(_model: str, _prompt: str, **_kw: object) -> AsyncIterator[str]:
        yield "should not reach"

    async def known_models() -> list[str] | None:
        return ["llama3.2", "mistral"]

    raw = asyncio.run(_collect_sse_with_models(payload, fake_llm, known_models))
    events = _parse_sse(raw)
    err = next(d for t, d in events if t == "error")
    assert "missing-model" in err["message"]
    assert "not available" in err["message"].lower()
    assert events[-1][0] == "done"


def test_executor_llm_valid_model_proceeds() -> None:
    payload = _make_llm_payload("hello", model="llama3.2")

    async def fake_llm(_model: str, _prompt: str, **_kw: object) -> AsyncIterator[str]:
        yield "hi"

    async def known_models() -> list[str] | None:
        return ["llama3.2", "mistral"]

    raw = asyncio.run(_collect_sse_with_models(payload, fake_llm, known_models))
    events = _parse_sse(raw)
    assert any(t == "token" for t, _ in events)
    assert events[-1][0] == "done"


def test_executor_llm_ollama_unreachable_skips_model_check() -> None:
    """When list_models returns None (Ollama unreachable), skip model validation."""
    payload = _make_llm_payload("hello", model="any-model")

    async def fake_llm(_model: str, _prompt: str, **_kw: object) -> AsyncIterator[str]:
        yield "ok"

    async def unreachable_models() -> list[str] | None:
        return None

    raw = asyncio.run(_collect_sse_with_models(payload, fake_llm, unreachable_models))
    events = _parse_sse(raw)
    assert any(t == "token" for t, _ in events)
    assert events[-1][0] == "done"
