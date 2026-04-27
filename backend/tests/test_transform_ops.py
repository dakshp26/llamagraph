import pytest

from backend.services.transform_ops import (
    MAX_TRANSFORM_INPUT_LENGTH,
    apply_transform_template,
    extract_json_field,
)


def test_extract_nested_object_field() -> None:
    raw = '{"user": {"name": "Alice"}}'
    assert extract_json_field(raw, "user.name") == "Alice"


def test_extract_array_index() -> None:
    raw = '{"items": [{"id": 1}]}'
    assert extract_json_field(raw, "items.0.id") == "1"


def test_template_replaces_input_placeholder() -> None:
    assert apply_transform_template("Hello {{input}}!", "World") == "Hello World!"


def test_extract_empty_path_returns_full_document() -> None:
    raw = '{"a":1,"b":{"c":2}}'
    assert extract_json_field(raw, "") == '{"a":1,"b":{"c":2}}'
    assert extract_json_field(raw, "  ") == '{"a":1,"b":{"c":2}}'


def test_extract_strips_json_code_fence() -> None:
    raw = '```json\n{"x": 1}\n```'
    assert extract_json_field(raw, "x") == "1"


def test_template_empty_passes_upstream() -> None:
    assert apply_transform_template("", '{"k":1}') == '{"k":1}'
    assert apply_transform_template("   ", "plain") == "plain"


def test_invalid_json_raises_plain_message() -> None:
    with pytest.raises(ValueError, match="expected JSON"):
        extract_json_field("not json", "x")


def test_extract_rejects_oversized_input() -> None:
    raw = "x" * (MAX_TRANSFORM_INPUT_LENGTH + 1)

    with pytest.raises(ValueError, match="input is too long"):
        extract_json_field(raw, "x")


def test_template_rejects_oversized_upstream_input() -> None:
    upstream = "x" * (MAX_TRANSFORM_INPUT_LENGTH + 1)

    with pytest.raises(ValueError, match="input is too long"):
        apply_transform_template("Hello {{input}}!", upstream)
