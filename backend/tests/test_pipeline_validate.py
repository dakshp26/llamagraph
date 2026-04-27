from fastapi.testclient import TestClient

from backend.main import app


def test_post_pipeline_validate_linear_ok() -> None:
    client = TestClient(app)
    body = {
        "nodes": [
            {"id": "i", "type": "input", "data": {"value": "x"}},
            {"id": "l", "type": "llm", "data": {}},
            {"id": "o", "type": "output", "data": {}},
        ],
        "edges": [
            {"id": "e1", "source": "i", "target": "l"},
            {"id": "e2", "source": "l", "target": "o"},
        ],
    }
    r = client.post("/pipeline/validate", json=body)
    assert r.status_code == 200
    assert r.json() == {"valid": True, "errors": []}


def test_post_pipeline_validate_cycle() -> None:
    client = TestClient(app)
    body = {
        "nodes": [
            {"id": "a", "type": "llm", "data": {}},
            {"id": "b", "type": "llm", "data": {}},
        ],
        "edges": [
            {"id": "e1", "source": "a", "target": "b"},
            {"id": "e2", "source": "b", "target": "a"},
        ],
    }
    r = client.post("/pipeline/validate", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["valid"] is False
    assert len(data["errors"]) >= 1
    assert "cycle" in data["errors"][0]["message"].lower()


def test_post_pipeline_validate_no_input() -> None:
    client = TestClient(app)
    body = {
        "nodes": [
            {"id": "l", "type": "llm", "data": {}},
            {"id": "o", "type": "output", "data": {}},
        ],
        "edges": [{"id": "e1", "source": "l", "target": "o"}],
    }
    r = client.post("/pipeline/validate", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["valid"] is False
    assert any("input" in e["message"].lower() for e in data["errors"])


def test_post_pipeline_validate_prompt_placeholder() -> None:
    client = TestClient(app)
    body = {
        "nodes": [
            {"id": "i", "type": "input", "data": {}},
            {"id": "p", "type": "prompt", "data": {"template": "Hi {{name}}"}},
            {"id": "o", "type": "output", "data": {}},
        ],
        "edges": [
            {"id": "e1", "source": "i", "target": "p"},
            {"id": "e2", "source": "p", "target": "o"},
        ],
    }
    r = client.post("/pipeline/validate", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["valid"] is False
    assert any(
        e.get("node_id") == "p" and "name" in e["message"].lower() for e in data["errors"]
    )
