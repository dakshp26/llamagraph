import asyncio
from collections.abc import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from backend.models.pipeline import GraphPayload, ValidateResponse, ValidationErrorItem
from backend.services.executor import execute_pipeline, sse_event
from backend.services.graph import validate_graph

router = APIRouter()

MAX_CONCURRENT_RUNS = 1
RUN_BUSY_MESSAGE = "Another pipeline is running. Try again when it finishes."
RUN_TIMEOUT_SECONDS = 300  # 5 minutes
RUN_TIMEOUT_MESSAGE = "Pipeline run timed out after 5 minutes."

_active_runs: int = 0


@router.post("/validate")
def validate_pipeline(payload: GraphPayload) -> ValidateResponse:
    issues = validate_graph(payload)
    errors = [
        ValidationErrorItem(node_id=i.node_id, message=i.message) for i in issues
    ]
    return ValidateResponse(valid=len(errors) == 0, errors=errors)


@router.post("/run")
async def run_pipeline(payload: GraphPayload) -> StreamingResponse:
    global _active_runs

    if _active_runs >= MAX_CONCURRENT_RUNS:

        async def busy() -> AsyncIterator[str]:
            yield sse_event("error", {"message": RUN_BUSY_MESSAGE})
            yield sse_event("done", {})

        return StreamingResponse(busy(), media_type="text/event-stream")

    issues = validate_graph(payload)
    if issues:
        msg = (
            issues[0].message
            if len(issues) == 1
            else "; ".join(i.message for i in issues)
        )

        async def invalid() -> AsyncIterator[str]:
            yield sse_event("error", {"message": msg})
            yield sse_event("done", {})

        return StreamingResponse(invalid(), media_type="text/event-stream")

    _active_runs += 1

    async def events() -> AsyncIterator[str]:
        global _active_runs
        try:
            async with asyncio.timeout(RUN_TIMEOUT_SECONDS):
                async for chunk in execute_pipeline(payload):
                    yield chunk
        except TimeoutError:
            yield sse_event("error", {"message": RUN_TIMEOUT_MESSAGE})
            yield sse_event("done", {})
        finally:
            _active_runs -= 1

    return StreamingResponse(events(), media_type="text/event-stream")
