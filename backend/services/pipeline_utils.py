import json
import re
from collections import deque
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any

from backend.models.pipeline import EdgeModel
from backend.services.constants import _PLACEHOLDER_RE

MAX_REGEX_PATTERN_LENGTH = 500
MAX_REGEX_INPUT_LENGTH = 20_000
MAX_LLM_PROMPT_LENGTH = 50_000
MAX_LLM_SYSTEM_PROMPT_LENGTH = 20_000

LLMStreamFn = Callable[..., AsyncIterator[str]]
GetModelsFn = Callable[[], Awaitable[list[str] | None]]


def sse_event(event: str, data: dict[str, Any]) -> str:
    return (
        f"event: {event}\ndata: "
        f"{json.dumps(data, ensure_ascii=False, separators=(',', ':'))}\n\n"
    )


def _incoming_edges(edges: list[EdgeModel], target_id: str) -> list[EdgeModel]:
    return [e for e in edges if e.target == target_id]


def _topo_index(topo_order: list[str]) -> dict[str, int]:
    return {nid: i for i, nid in enumerate(topo_order)}


def _assemble_from_incoming(
    node_id: str,
    edges: list[EdgeModel],
    context: dict[str, str],
    topo_order: list[str],
    skipped: set[str],
) -> str:
    inc = [e for e in _incoming_edges(edges, node_id) if e.source not in skipped]
    idx = _topo_index(topo_order)

    def sort_key(e: EdgeModel) -> tuple[int, str]:
        return (idx.get(e.source, 0), e.source)

    parts = [context.get(e.source, "") for e in sorted(inc, key=sort_key)]
    return "\n\n".join(p for p in parts if p)


def _resolve_prompt_template(
    template: str,
    node_id: str,
    edges: list[EdgeModel],
    context: dict[str, str],
    skipped: set[str],
) -> str:
    def repl(m: re.Match[str]) -> str:
        name = m.group(1)
        for e in edges:
            if (
                e.target == node_id
                and e.target_handle == name
                and e.source not in skipped
            ):
                return context.get(e.source, "")
        return m.group(0)

    return _PLACEHOLDER_RE.sub(repl, template)


def _friendly_llm_error(exc: BaseException) -> str:
    if isinstance(exc, ConnectionError):
        return "Ollama is not reachable. Start Ollama and try again."
    msg = str(exc).strip()
    return msg if msg else "Something went wrong while running the language model."


def _forward_reachable(edges: list[EdgeModel], seeds: set[str]) -> set[str]:
    seen: set[str] = set(seeds)
    q: deque[str] = deque(seeds)
    while q:
        u = q.popleft()
        for e in edges:
            if e.source == u and e.target not in seen:
                seen.add(e.target)
                q.append(e.target)
    return seen


def _norm_handle(h: str | None) -> str:
    return (h or "").strip().lower()


def _find_quantifier_end(pattern: str, start: int) -> int:
    if pattern[start] != "{":
        return start
    end = pattern.find("}", start + 1)
    if end == -1:
        return start
    body = pattern[start + 1 : end]
    parts = body.split(",", 1)
    if not parts[0].isdigit():
        return start
    if len(parts) == 2 and parts[1] and not parts[1].isdigit():
        return start
    return end


def _has_nested_quantifier(pattern: str) -> bool:
    # Detects patterns where a quantifier wraps a group that itself contains a
    # quantifier — e.g. (a+)+, (a*)*, (a+)? — which cause catastrophic
    # backtracking in Python's stdlib `re`. Does NOT catch all ReDoS vectors
    # (e.g. alternation-based patterns like (a|aa)+); size limits are the
    # second line of defence for those cases.
    stack: list[bool] = []
    escaped = False
    in_class = False
    pending_group_had_quantifier: bool | None = None
    i = 0

    while i < len(pattern):
        ch = pattern[i]
        if escaped:
            escaped = False
            pending_group_had_quantifier = None
            i += 1
            continue

        if ch == "\\":
            escaped = True
            i += 1
            continue

        if in_class:
            if ch == "]":
                in_class = False
            i += 1
            continue

        if ch == "[":
            in_class = True
            pending_group_had_quantifier = None
            i += 1
            continue

        if ch == "(":
            stack.append(False)
            pending_group_had_quantifier = None
            i += 1
            if i < len(pattern) and pattern[i] == "?":
                i += 1
                if i < len(pattern) and pattern[i] in (":", "=", "!"):
                    i += 1
                elif i < len(pattern) and pattern[i] == "<":
                    i += 1
                    if i < len(pattern) and pattern[i] in ("=", "!"):
                        i += 1
                    else:
                        while i < len(pattern) and pattern[i] != ">":
                            i += 1
                        if i < len(pattern):
                            i += 1
                else:
                    while i < len(pattern) and pattern[i] not in (":", ")"):
                        i += 1
                    if i < len(pattern) and pattern[i] == ":":
                        i += 1
            continue

        if ch == ")" and stack:
            pending_group_had_quantifier = stack.pop()
            i += 1
            continue

        quantifier_end = _find_quantifier_end(pattern, i) if ch == "{" else i
        is_quantifier = ch in "*+?" or quantifier_end != i
        if is_quantifier:
            if pending_group_had_quantifier:
                return True
            if stack:
                stack[-1] = True
            pending_group_had_quantifier = None
            i = quantifier_end + 1
            continue

        pending_group_had_quantifier = None
        i += 1

    return False


def ensure_safe_regex(pattern: str, input_text: str) -> re.Pattern[str]:
    if len(pattern) > MAX_REGEX_PATTERN_LENGTH:
        raise ValueError("Regex pattern is too long.")
    if len(input_text) > MAX_REGEX_INPUT_LENGTH:
        raise ValueError("Regex input is too long.")
    if _has_nested_quantifier(pattern):
        raise ValueError("Regex pattern is too complex.")
    try:
        return re.compile(pattern)
    except re.error as exc:
        raise ValueError("Enter a valid regex pattern.") from exc


def safe_regex_search(pattern: str, input_text: str) -> bool:
    return ensure_safe_regex(pattern, input_text).search(input_text) is not None


def _condition_matches(pattern: str, text: str) -> bool:
    p = pattern.strip()
    if len(p) >= 2 and p.startswith("/") and p.endswith("/"):
        inner = p[1:-1]
        return safe_regex_search(inner, text)
    return p.lower() in text.lower()
