import pytest

from backend.services.pipeline_utils import (
    MAX_REGEX_INPUT_LENGTH,
    MAX_REGEX_PATTERN_LENGTH,
    ensure_safe_regex,
    safe_regex_search,
)


def test_safe_regex_search_allows_ordinary_pattern() -> None:
    assert safe_regex_search(r"error\s+\d+", "Got error 42") is True
    assert safe_regex_search(r"error\s+\d+", "all clear") is False


def test_safe_regex_rejects_long_pattern() -> None:
    pattern = "a" * (MAX_REGEX_PATTERN_LENGTH + 1)

    with pytest.raises(ValueError, match="pattern is too long"):
        ensure_safe_regex(pattern, "abc")


def test_safe_regex_rejects_long_input() -> None:
    text = "a" * (MAX_REGEX_INPUT_LENGTH + 1)

    with pytest.raises(ValueError, match="input is too long"):
        ensure_safe_regex("a", text)


def test_safe_regex_rejects_nested_quantifier_pattern() -> None:
    with pytest.raises(ValueError, match="too complex"):
        ensure_safe_regex(r"(a+)+$", "aaaa")


def test_safe_regex_rejects_invalid_pattern_with_friendly_message() -> None:
    with pytest.raises(ValueError, match="valid regex"):
        ensure_safe_regex("[", "abc")
