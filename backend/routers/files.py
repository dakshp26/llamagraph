import asyncio
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile

from backend.services.file_converter import FILES_DIR, convert_file_to_markdown

router = APIRouter()

_ALLOWED_EXTENSIONS = {".pdf", ".docx", ".ppt", ".pptx"}
_MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB


@router.get("")
async def list_files(extensions: str = "") -> dict:
    FILES_DIR.mkdir(parents=True, exist_ok=True)
    ext_filter = {e.strip().lower() for e in extensions.split(",") if e.strip()}
    files = [
        f.name
        for f in FILES_DIR.iterdir()
        if f.is_file() and (not ext_filter or f.suffix.lower() in ext_filter)
    ]
    return {"files": sorted(files)}


@router.post("/upload")
async def upload_file(file: UploadFile) -> dict:
    filename = file.filename or ""
    safe_name = Path(filename).name
    if safe_name != filename or not safe_name:
        raise HTTPException(status_code=422, detail=f"Invalid filename: {filename!r}")

    if Path(safe_name).suffix.lower() not in _ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=422, detail="Unsupported file type.")

    content = await file.read(_MAX_UPLOAD_BYTES + 1)
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 50 MB limit.")

    FILES_DIR.mkdir(parents=True, exist_ok=True)
    dest = FILES_DIR / safe_name
    replaced = dest.exists()
    dest.write_bytes(content)
    return {"filename": safe_name, "replaced": replaced}


_PREVIEW_TRUNCATE_CHARS = 20_000


@router.get("/preview/{filename}")
async def preview_file(filename: str) -> dict:
    safe_name = Path(filename).name
    if safe_name != filename or not safe_name:
        raise HTTPException(status_code=422, detail=f"Invalid filename: {filename!r}")
    try:
        markdown = await asyncio.to_thread(convert_file_to_markdown, safe_name)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail="Conversion failed. The file may be corrupted or in an unsupported format.",
        ) from exc

    return {"filename": safe_name, "markdown": markdown[:_PREVIEW_TRUNCATE_CHARS]}
