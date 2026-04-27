import json
import re
from typing import Any

_JSON_EXPECTED_MSG = "This block expected JSON but got plain text."
_TRANSFORM_INPUT_TOO_LONG_MSG = "Transform input is too long."

MAX_TRANSFORM_INPUT_LENGTH = 20_000

_TEMPLATE_INPUT_RE = re.compile(r"\{\{\s*input\s*\}\}")


def _unwrap_json_fence(raw: str) -> str:
    s = raw.strip()
    if not s.startswith("```"):
        return s
    lines = s.split("\n")
    if lines and lines[0].lstrip().startswith("```"):
        lines = lines[1:]
    while lines and lines[-1].strip() == "":
        lines.pop()
    if lines and lines[-1].strip().startswith("```"):
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _parse_json_for_extract(raw: str) -> Any:
    _ensure_transform_input_size(raw)
    s = _unwrap_json_fence(raw)
    try:
        return json.loads(s)
    except json.JSONDecodeError as exc:
        raise ValueError(_JSON_EXPECTED_MSG) from exc


def _get_by_path(obj: Any, path: str) -> Any:
    parts = [p for p in path.split(".") if p.strip() != ""]
    if not parts:
        raise ValueError("Enter a JSON path (for example user.name).")
    cur: Any = obj
    for part in parts:
        if isinstance(cur, list):
            try:
                idx = int(part)
            except ValueError as exc:
                raise ValueError(
                    f'Cannot use "{part}" as an array index — use a whole number.'
                ) from exc
            if idx < 0 or idx >= len(cur):
                raise ValueError(f"Index {idx} is out of range for this JSON array.")
            cur = cur[idx]
        elif isinstance(cur, dict):
            if part not in cur:
                raise ValueError(f'Key "{part}" was not found in the JSON.')
            cur = cur[part]
        else:
            raise ValueError(
                "Cannot read deeper into this JSON value — it is not an object or array."
            )
    return cur


def _format_extracted_value(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, (dict, list)):
        return json.dumps(val, ensure_ascii=False, separators=(",", ":"))
    return str(val)


def _ensure_transform_input_size(input_text: str) -> None:
    if len(input_text) > MAX_TRANSFORM_INPUT_LENGTH:
        raise ValueError(_TRANSFORM_INPUT_TOO_LONG_MSG)


def extract_json_field(raw: str, path: str) -> str:
    obj = _parse_json_for_extract(raw)
    p = path.strip()
    if not p:
        return _format_extracted_value(obj)
    val = _get_by_path(obj, p)
    return _format_extracted_value(val)


def apply_transform_template(template: str, upstream: str) -> str:
    _ensure_transform_input_size(upstream)
    tpl = template.strip()
    if not tpl:
        return upstream
    return _TEMPLATE_INPUT_RE.sub(lambda _: upstream, tpl)
