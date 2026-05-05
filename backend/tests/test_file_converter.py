import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


def test_safe_path_rejects_path_traversal() -> None:
    from backend.services.file_converter import _safe_path

    with pytest.raises(ValueError, match="Invalid filename"):
        _safe_path("../etc/passwd")


def test_safe_path_rejects_path_with_separator() -> None:
    from backend.services.file_converter import _safe_path

    with pytest.raises(ValueError, match="Invalid filename"):
        _safe_path("subdir/file.pdf")


def test_safe_path_rejects_empty_string() -> None:
    from backend.services.file_converter import _safe_path

    with pytest.raises(ValueError, match="Invalid filename"):
        _safe_path("")


def test_safe_path_accepts_plain_filename() -> None:
    from backend.services.file_converter import FILES_DIR, _safe_path

    result = _safe_path("report.pdf")
    assert result == (FILES_DIR / "report.pdf").resolve()


def test_convert_file_raises_file_not_found_for_missing_file() -> None:
    from backend.services.file_converter import convert_file_to_markdown

    with pytest.raises(FileNotFoundError, match="nonexistent.pdf"):
        convert_file_to_markdown("nonexistent.pdf")


def test_convert_file_returns_markdown_string(tmp_path: Path) -> None:
    from backend.services import file_converter

    fake_result = MagicMock()
    fake_result.text_content = "# Hello\n\nWorld"

    fake_md = MagicMock()
    fake_md.convert_local.return_value = fake_result

    # Write a real file into FILES_DIR
    files_dir = file_converter.FILES_DIR
    files_dir.mkdir(parents=True, exist_ok=True)
    test_file = files_dir / "test_convert.pdf"
    test_file.write_bytes(b"%PDF-fake")

    try:
        # Clear cache so this test is isolated
        file_converter._cache.clear()
        with patch("backend.services.file_converter.MarkItDown", return_value=fake_md):
            result = file_converter.convert_file_to_markdown("test_convert.pdf")
        assert result == "# Hello\n\nWorld"
    finally:
        test_file.unlink(missing_ok=True)
        file_converter._cache.clear()


def test_convert_file_uses_mtime_cache(tmp_path: Path) -> None:
    from backend.services import file_converter

    fake_result = MagicMock()
    fake_result.text_content = "cached"

    fake_md = MagicMock()
    fake_md.convert_local.return_value = fake_result

    files_dir = file_converter.FILES_DIR
    files_dir.mkdir(parents=True, exist_ok=True)
    test_file = files_dir / "test_cache.pdf"
    test_file.write_bytes(b"%PDF-fake")

    try:
        file_converter._cache.clear()
        with patch("backend.services.file_converter.MarkItDown", return_value=fake_md):
            file_converter.convert_file_to_markdown("test_cache.pdf")
            file_converter.convert_file_to_markdown("test_cache.pdf")
        # MarkItDown should only be instantiated once due to caching
        assert fake_md.convert_local.call_count == 1
    finally:
        test_file.unlink(missing_ok=True)
        file_converter._cache.clear()


def test_convert_file_invalidates_cache_on_mtime_change() -> None:
    from backend.services import file_converter

    fake_result1 = MagicMock()
    fake_result1.text_content = "version 1"
    fake_result2 = MagicMock()
    fake_result2.text_content = "version 2"

    fake_md = MagicMock()
    fake_md.convert_local.side_effect = [fake_result1, fake_result2]

    files_dir = file_converter.FILES_DIR
    files_dir.mkdir(parents=True, exist_ok=True)
    test_file = files_dir / "test_invalidate.pdf"
    test_file.write_bytes(b"%PDF-v1")

    try:
        file_converter._cache.clear()
        with patch("backend.services.file_converter.MarkItDown", return_value=fake_md):
            result1 = file_converter.convert_file_to_markdown("test_invalidate.pdf")
            # Advance mtime by 1 second so the cache key changes
            mtime = test_file.stat().st_mtime
            os.utime(test_file, (mtime + 1, mtime + 1))
            result2 = file_converter.convert_file_to_markdown("test_invalidate.pdf")
        assert result1 == "version 1"
        assert result2 == "version 2"
        assert fake_md.convert_local.call_count == 2
    finally:
        test_file.unlink(missing_ok=True)
        file_converter._cache.clear()
