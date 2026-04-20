from __future__ import annotations

import json
from typing import AsyncIterator

import httpx

from backend.llm.base import LLMProvider, Message, StreamEvent


class OllamaProvider(LLMProvider):
    name = "ollama"

    def __init__(self, base_url: str):
        self._base_url = base_url.rstrip("/")

    async def stream(
        self,
        messages: list[Message],
        system: str,
        model: str,
    ) -> AsyncIterator[StreamEvent]:
        payload = {
            "model": model,
            "messages": [{"role": "system", "content": system}]
            + [{"role": m.role, "content": m.content} for m in messages],
            "stream": True,
        }
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST", f"{self._base_url}/api/chat", json=payload
                ) as resp:
                    if resp.status_code != 200:
                        yield {"type": "text", "text": f"[Zippy] Ollama returned {resp.status_code}"}
                        return
                    async for line in resp.aiter_lines():
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        if chunk.get("done"):
                            break
                        piece = chunk.get("message", {}).get("content", "")
                        if piece:
                            yield {"type": "text", "text": piece}
        except httpx.ConnectError:
            yield {"type": "text", "text": f"[Zippy] Can't reach Ollama at {self._base_url}. Is it running?"}
        except Exception as e:
            yield {"type": "text", "text": f"[Zippy] Ollama error: {e}"}

    async def health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self._base_url}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False
