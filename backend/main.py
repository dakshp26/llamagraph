from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import ollama as ollama_router
from backend.routers import pipeline as pipeline_router

app = FastAPI(title="LlamaGraph Backend")

app.include_router(ollama_router.router, prefix="/ollama")
app.include_router(pipeline_router.router, prefix="/pipeline")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    return {"status": "ok"}
