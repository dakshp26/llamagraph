import threading
from collections import OrderedDict
from pathlib import Path

from markitdown import MarkItDown

FILES_DIR = Path(__file__).parent.parent / "files"

_CACHE_MAX = 128
# Per-process only: each uvicorn worker holds its own cache instance.
# LRU cache: (filename, mtime) -> markdown string; evicts oldest when full
_cache: OrderedDict[tuple[str, float], str] = OrderedDict()
_cache_lock = threading.Lock()


def _safe_path(filename: str) -> Path:
    """Resolve filename to an absolute path confined to FILES_DIR.
    Raises ValueError on path traversal attempts."""
    safe_name = Path(filename).name
    if safe_name != filename or not safe_name:
        raise ValueError(f"Invalid filename: {filename!r}")
    resolved = (FILES_DIR / safe_name).resolve()
    if not resolved.is_relative_to(FILES_DIR.resolve()):
        raise ValueError(f"Path traversal rejected: {filename!r}")
    return resolved


def convert_file_to_markdown(filename: str) -> str:
    path = _safe_path(filename)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {filename}")
    mtime = path.stat().st_mtime
    key = (filename, mtime)
    with _cache_lock:
        if key in _cache:
            _cache.move_to_end(key)
            return _cache[key]
    md = MarkItDown()
    value = md.convert_local(path).text_content
    with _cache_lock:
        _cache[key] = value
        if len(_cache) > _CACHE_MAX:
            _cache.popitem(last=False)
    return value
