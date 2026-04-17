from __future__ import annotations

from typing import Any, AsyncIterator

from anthropic import AsyncAnthropic, APIError

from backend.llm.base import LLMProvider, Message


def _parse_data_url(data_url: str) -> tuple[str, str] | None:
    """Parse 'data:image/jpeg;base64,XXXX' → ('image/jpeg', 'XXXX')."""
    if not data_url.startswith("data:"):
        return None
    try:
        header, b64 = data_url.split(",", 1)
        media = header[5:].split(";")[0] or "image/jpeg"
        return media, b64
    except ValueError:
        return None


def _build_content(msg: Message) -> str | list[dict[str, Any]]:
    if not msg.image:
        return msg.content
    parsed = _parse_data_url(msg.image)
    if parsed is None:
        return msg.content
    media_type, b64 = parsed
    return [
        {
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": b64},
        },
        {"type": "text", "text": msg.content or ""},
    ]


class AnthropicProvider(LLMProvider):
    name = "anthropic"

    def __init__(self, api_key: str):
        self._client = AsyncAnthropic(api_key=api_key) if api_key else None

    async def stream(
        self,
        messages: list[Message],
        system: str,
        model: str,
    ) -> AsyncIterator[str]:
        if self._client is None:
            yield "[Zippy] No ANTHROPIC_API_KEY configured. Set it in .env and restart."
            return

        payload = [{"role": m.role, "content": _build_content(m)} for m in messages]
        try:
            async with self._client.messages.stream(
                model=model,
                max_tokens=2048,
                system=system,
                messages=payload,
            ) as stream:
                async for text in stream.text_stream:
                    yield text
        except APIError as e:
            yield f"[Zippy] Anthropic API error: {e.message if hasattr(e, 'message') else str(e)}"
        except Exception as e:
            yield f"[Zippy] Unexpected error: {e}"

    async def health(self) -> bool:
        return self._client is not None
