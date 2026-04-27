from backend.models.pipeline import EdgeModel, GraphPayload, NodeModel
from backend.services.graph import (
    has_cycle,
    topological_sort,
    validate_graph,
)


def test_has_cycle_false_for_linear_chain() -> None:
    nodes = [
        NodeModel(id="a", type="input", data={}),
        NodeModel(id="b", type="llm", data={}),
        NodeModel(id="c", type="output", data={}),
    ]
    edges = [
        EdgeModel(id="e1", source="a", target="b"),
        EdgeModel(id="e2", source="b", target="c"),
    ]
    assert has_cycle(nodes, edges) is False


def test_has_cycle_true_for_two_node_loop() -> None:
    nodes = [
        NodeModel(id="a", type="llm", data={}),
        NodeModel(id="b", type="llm", data={}),
    ]
    edges = [
        EdgeModel(id="e1", source="a", target="b"),
        EdgeModel(id="e2", source="b", target="a"),
    ]
    assert has_cycle(nodes, edges) is True


def test_topological_sort_linear() -> None:
    nodes = [
        NodeModel(id="in", type="input", data={}),
        NodeModel(id="mid", type="llm", data={}),
        NodeModel(id="out", type="output", data={}),
    ]
    edges = [
        EdgeModel(id="e1", source="in", target="mid"),
        EdgeModel(id="e2", source="mid", target="out"),
    ]
    order = topological_sort(nodes, edges)
    assert order.index("in") < order.index("mid") < order.index("out")


def test_validate_linear_input_llm_output() -> None:
    payload = GraphPayload(
        nodes=[
            NodeModel(id="i", type="input", data={"value": "hi"}),
            NodeModel(id="l", type="llm", data={}),
            NodeModel(id="o", type="output", data={}),
        ],
        edges=[
            EdgeModel(id="e1", source="i", target="l"),
            EdgeModel(id="e2", source="l", target="o"),
        ],
    )
    errors = validate_graph(payload)
    assert errors == []


def test_validate_cycle_error() -> None:
    payload = GraphPayload(
        nodes=[
            NodeModel(id="a", type="llm", data={}),
            NodeModel(id="b", type="llm", data={}),
        ],
        edges=[
            EdgeModel(id="e1", source="a", target="b"),
            EdgeModel(id="e2", source="b", target="a"),
        ],
    )
    errors = validate_graph(payload)
    assert len(errors) == 1
    assert errors[0].node_id is None
    assert "cycle" in errors[0].message.lower()


def test_validate_no_input_node() -> None:
    payload = GraphPayload(
        nodes=[
            NodeModel(id="l", type="llm", data={}),
            NodeModel(id="o", type="output", data={}),
        ],
        edges=[
            EdgeModel(id="e1", source="l", target="o"),
        ],
    )
    errors = validate_graph(payload)
    assert any("input" in e.message.lower() for e in errors)


def test_validate_prompt_placeholder_missing_edge() -> None:
    payload = GraphPayload(
        nodes=[
            NodeModel(id="i", type="input", data={}),
            NodeModel(id="p", type="prompt", data={"template": "Hello {{name}}"}),
            NodeModel(id="o", type="output", data={}),
        ],
        edges=[
            EdgeModel(id="e1", source="i", target="p"),
            EdgeModel(id="e2", source="p", target="o"),
        ],
    )
    errors = validate_graph(payload)
    assert any(e.node_id == "p" and "name" in e.message.lower() for e in errors)


def test_validate_prompt_without_placeholders_allows_no_incoming() -> None:
    payload = GraphPayload(
        nodes=[
            NodeModel(id="i", type="input", data={}),
            NodeModel(id="p", type="prompt", data={"template": ""}),
            NodeModel(id="o", type="output", data={}),
        ],
        edges=[
            EdgeModel(id="e1", source="i", target="o"),
        ],
    )
    errors = validate_graph(payload)
    assert errors == []


def test_validate_prompt_placeholder_ok_when_handle_wired() -> None:
    payload = GraphPayload(
        nodes=[
            NodeModel(id="i", type="input", data={}),
            NodeModel(id="p", type="prompt", data={"template": "Hello {{name}}"}),
            NodeModel(id="o", type="output", data={}),
        ],
        edges=[
            EdgeModel(id="e1", source="i", target="p", targetHandle="name"),
            EdgeModel(id="e2", source="p", target="o"),
        ],
    )
    errors = validate_graph(payload)
    assert errors == []
