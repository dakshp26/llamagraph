import ollama
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def ollama_health() -> dict[str, bool]:
    try:
        ollama.list()
    except Exception:
        return {"running": False}
    return {"running": True}


@router.get("/models")
def ollama_models() -> dict[str, list[str]]:
    try:
        resp = ollama.list()
    except Exception:
        return {"models": []}
    names = [m.model for m in resp.models if m.model]
    return {"models": names}
