from __future__ import annotations

from typing import AsyncIterator

from anthropic import AsyncAnthropic, APIError

from backend.llm.base import LLMProvider, Message


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

        payload = [{"role": m.role, "content": m.content} for m in messages]
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
