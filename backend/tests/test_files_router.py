import io
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_get_files_returns_empty_when_dir_empty(client: TestClient, tmp_path: Path) -> None:
    with (
        patch("backend.routers.files.FILES_DIR", tmp_path),
        patch("backend.services.file_converter.FILES_DIR", tmp_path),
    ):
        r = client.get("/files")
    assert r.status_code == 200
    assert r.json() == {"files": []}


def test_get_files_lists_files(client: TestClient, tmp_path: Path) -> None:
    (tmp_path / "a.pdf").write_bytes(b"x")
    (tmp_path / "b.docx").write_bytes(b"x")
    with (
        patch("backend.routers.files.FILES_DIR", tmp_path),
        patch("backend.services.file_converter.FILES_DIR", tmp_path),
    ):
        r = client.get("/files")
    assert r.status_code == 200
    assert sorted(r.json()["files"]) == ["a.pdf", "b.docx"]


def test_get_files_filters_by_extension(client: TestClient, tmp_path: Path) -> None:
    (tmp_path / "report.pdf").write_bytes(b"x")
    (tmp_path / "notes.docx").write_bytes(b"x")
    with (
        patch("backend.routers.files.FILES_DIR", tmp_path),
        patch("backend.services.file_converter.FILES_DIR", tmp_path),
    ):
        r = client.get("/files?extensions=.pdf")
    assert r.status_code == 200
    assert r.json() == {"files": ["report.pdf"]}


def test_upload_saves_file(client: TestClient, tmp_path: Path) -> None:
    with (
        patch("backend.routers.files.FILES_DIR", tmp_path),
        patch("backend.services.file_converter.FILES_DIR", tmp_path),
    ):
        r = client.post(
            "/files/upload",
            files={"file": ("myfile.pdf", io.BytesIO(b"%PDF-content"), "application/pdf")},
        )
    assert r.status_code == 200
    assert r.json() == {"filename": "myfile.pdf", "replaced": False}
    assert (tmp_path / "myfile.pdf").read_bytes() == b"%PDF-content"


def test_upload_returns_replaced_true_for_existing_file(client: TestClient, tmp_path: Path) -> None:
    (tmp_path / "myfile.pdf").write_bytes(b"%PDF-original")
    with (
        patch("backend.routers.files.FILES_DIR", tmp_path),
        patch("backend.services.file_converter.FILES_DIR", tmp_path),
    ):
        r = client.post(
            "/files/upload",
            files={"file": ("myfile.pdf", io.BytesIO(b"%PDF-updated"), "application/pdf")},
        )
    assert r.status_code == 200
    assert r.json()["replaced"] is True
    assert (tmp_path / "myfile.pdf").read_bytes() == b"%PDF-updated"


def test_upload_rejects_path_traversal(client: TestClient, tmp_path: Path) -> None:
    with (
        patch("backend.routers.files.FILES_DIR", tmp_path),
        patch("backend.services.file_converter.FILES_DIR", tmp_path),
    ):
        r = client.post(
            "/files/upload",
            files={"file": ("../evil.pdf", io.BytesIO(b"bad"), "application/pdf")},
        )
    assert r.status_code == 422


def test_preview_returns_markdown(client: TestClient, tmp_path: Path) -> None:
    (tmp_path / "doc.pdf").write_bytes(b"%PDF-fake")
    with (
        patch("backend.routers.files.FILES_DIR", tmp_path),
        patch("backend.services.file_converter.FILES_DIR", tmp_path),
        patch(
            "backend.routers.files.convert_file_to_markdown",
            return_value="# Doc\n\nHello",
        ),
    ):
        r = client.get("/files/preview/doc.pdf")
    assert r.status_code == 200
    data = r.json()
    assert data["filename"] == "doc.pdf"
    assert data["markdown"] == "# Doc\n\nHello"


def test_preview_returns_404_for_missing_file(client: TestClient, tmp_path: Path) -> None:
    with (
        patch("backend.routers.files.FILES_DIR", tmp_path),
        patch("backend.services.file_converter.FILES_DIR", tmp_path),
        patch(
            "backend.routers.files.convert_file_to_markdown",
            side_effect=FileNotFoundError("missing.pdf"),
        ),
    ):
        r = client.get("/files/preview/missing.pdf")
    assert r.status_code == 404


def test_preview_returns_422_on_conversion_error(client: TestClient, tmp_path: Path) -> None:
    (tmp_path / "bad.pdf").write_bytes(b"not-a-pdf")
    with (
        patch("backend.routers.files.FILES_DIR", tmp_path),
        patch("backend.services.file_converter.FILES_DIR", tmp_path),
        patch(
            "backend.routers.files.convert_file_to_markdown",
            side_effect=Exception("conversion failed"),
        ),
    ):
        r = client.get("/files/preview/bad.pdf")
    assert r.status_code == 422


def test_preview_returns_422_when_converter_raises_value_error(client: TestClient, tmp_path: Path) -> None:
    # ValueError from convert_file_to_markdown (e.g. path traversal detected by _safe_path)
    # must map to 422. Path traversal at the URL level is normalised by FastAPI's router before
    # reaching the handler; _safe_path's own traversal tests live in test_file_converter.py.
    with (
        patch("backend.routers.files.FILES_DIR", tmp_path),
        patch("backend.services.file_converter.FILES_DIR", tmp_path),
        patch(
            "backend.routers.files.convert_file_to_markdown",
            side_effect=ValueError("Invalid filename: '../evil.pdf'"),
        ),
    ):
        r = client.get("/files/preview/evil.pdf")
    assert r.status_code == 422


def test_upload_rejects_disallowed_extension(client: TestClient, tmp_path: Path) -> None:
    with (
        patch("backend.routers.files.FILES_DIR", tmp_path),
        patch("backend.services.file_converter.FILES_DIR", tmp_path),
    ):
        r = client.post(
            "/files/upload",
            files={"file": ("evil.sh", io.BytesIO(b"#!/bin/bash"), "text/plain")},
        )
    assert r.status_code == 422
    assert (tmp_path / "evil.sh").exists() is False


def test_upload_rejects_file_exceeding_size_limit(client: TestClient, tmp_path: Path) -> None:
    big = b"x" * (50 * 1024 * 1024 + 1)
    with (
        patch("backend.routers.files.FILES_DIR", tmp_path),
        patch("backend.services.file_converter.FILES_DIR", tmp_path),
    ):
        r = client.post(
            "/files/upload",
            files={"file": ("big.pdf", io.BytesIO(big), "application/pdf")},
        )
    assert r.status_code == 413
