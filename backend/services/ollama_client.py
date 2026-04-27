import ollama

_client = ollama.AsyncClient()


async def list_models() -> list[str] | None:
    """Return available local Ollama model names, or None if Ollama is unreachable."""
    try:
        response = await _client.list()
        return [m.model for m in response.models]
    except Exception:
        return None


async def stream_chat(
    model: str,
    prompt: str,
    *,
    temperature: float | None = None,
    system_prompt: str | None = None,
):
    """Yield text deltas from Ollama chat with streaming enabled."""
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    options: dict = {}
    if temperature is not None:
        options["temperature"] = temperature

    stream = await _client.chat(
        model=model,
        messages=messages,
        stream=True,
        **({"options": options} if options else {}),
    )
    async for chunk in stream:
        msg = chunk.message
        text = msg.content if msg else None
        if text:
            yield text
