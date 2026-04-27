from dataclasses import dataclass
from graphlib import CycleError, TopologicalSorter

from backend.models.pipeline import EdgeModel, GraphPayload, NodeModel
from backend.services.constants import _PLACEHOLDER_RE


@dataclass(frozen=True)
class GraphValidationIssue:
    node_id: str | None
    message: str


def _topological_sorter(nodes: list[NodeModel], edges: list[EdgeModel]) -> TopologicalSorter[str]:
    node_ids = {n.id for n in nodes}
    ts: TopologicalSorter[str] = TopologicalSorter()
    for nid in node_ids:
        ts.add(nid)
    for e in edges:
        if e.source in node_ids and e.target in node_ids:
            ts.add(e.target, e.source)
    return ts


def has_cycle(nodes: list[NodeModel], edges: list[EdgeModel]) -> bool:
    ts = _topological_sorter(nodes, edges)
    try:
        tuple(ts.static_order())
    except CycleError:
        return True
    return False


def topological_sort(nodes: list[NodeModel], edges: list[EdgeModel]) -> list[str]:
    ts = _topological_sorter(nodes, edges)
    try:
        return list(ts.static_order())
    except CycleError as exc:
        raise ValueError("The graph contains a cycle and cannot run.") from exc


def _prompt_template_text(data: dict) -> str:
    raw = data.get("template") if data.get("template") is not None else data.get("text")
    return "" if raw is None else str(raw)


def validate_graph(payload: GraphPayload) -> list[GraphValidationIssue]:
    nodes = payload.nodes
    edges = payload.edges
    node_ids = {n.id for n in nodes}

    if has_cycle(nodes, edges):
        return [
            GraphValidationIssue(
                None,
                "The graph contains a cycle and cannot run.",
            )
        ]

    errors: list[GraphValidationIssue] = []

    types_lower = [n.type.lower() for n in nodes]
    if not any(t == "input" for t in types_lower):
        errors.append(
            GraphValidationIssue(
                None,
                "Add at least one Input node to start the pipeline.",
            )
        )
    if not any(t == "output" for t in types_lower):
        errors.append(
            GraphValidationIssue(
                None,
                "Add at least one Output node to finish the pipeline.",
            )
        )

    incoming: dict[str, list[EdgeModel]] = {nid: [] for nid in node_ids}
    for e in edges:
        if e.target in node_ids:
            incoming[e.target].append(e)

    for n in nodes:
        if n.type.lower() == "input":
            continue
        if n.type.lower() == "prompt" and not _PLACEHOLDER_RE.search(
            _prompt_template_text(n.data)
        ):
            continue
        if not incoming[n.id]:
            errors.append(
                GraphValidationIssue(
                    n.id,
                    f'Node "{n.id}" needs at least one incoming connection.',
                )
            )

    for n in nodes:
        if n.type.lower() != "prompt":
            continue
        text = _prompt_template_text(n.data)
        placeholders = _PLACEHOLDER_RE.findall(text)
        inc = incoming[n.id]
        target_handles = {e.target_handle for e in inc if e.target_handle}
        for name in placeholders:
            if name not in target_handles:
                errors.append(
                    GraphValidationIssue(
                        n.id,
                        f'Template references "{{{{{name}}}}}" but no incoming edge targets '
                        f'handle "{name}".',
                    )
                )

    return errors
