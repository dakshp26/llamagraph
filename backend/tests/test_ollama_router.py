from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from ollama import ListResponse

from backend.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health_running_when_ollama_list_succeeds(client: TestClient) -> None:
    fake = ListResponse(
        models=[
            ListResponse.Model(model="llama3.2:latest"),
            ListResponse.Model(model="mistral"),
        ]
    )
    with patch("backend.routers.ollama.ollama.list", return_value=fake):
        r = client.get("/ollama/health")
    assert r.status_code == 200
    assert r.json() == {"running": True}


def test_health_not_running_when_ollama_unreachable(client: TestClient) -> None:
    with patch("backend.routers.ollama.ollama.list", side_effect=ConnectionError("offline")):
        r = client.get("/ollama/health")
    assert r.status_code == 200
    assert r.json() == {"running": False}


def test_models_returns_names_when_ollama_list_succeeds(client: TestClient) -> None:
    fake = ListResponse(
        models=[
            ListResponse.Model(model="a:latest"),
            ListResponse.Model(model="b"),
        ]
    )
    with patch("backend.routers.ollama.ollama.list", return_value=fake):
        r = client.get("/ollama/models")
    assert r.status_code == 200
    assert r.json() == {"models": ["a:latest", "b"]}


def test_models_empty_when_ollama_unreachable(client: TestClient) -> None:
    with patch("backend.routers.ollama.ollama.list", side_effect=ConnectionError("offline")):
        r = client.get("/ollama/models")
    assert r.status_code == 200
    assert r.json() == {"models": []}
