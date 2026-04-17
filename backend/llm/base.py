from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncIterator, Literal


Role = Literal["user", "assistant"]


@dataclass
class Message:
    role: Role
    content: str
    # Optional inline image (data URL: "data:image/jpeg;base64,...").
    # Only attached to the current turn's user message — not persisted.
    image: str | None = None


class LLMProvider(ABC):
    name: str

    @abstractmethod
    async def stream(
        self,
        messages: list[Message],
        system: str,
        model: str,
    ) -> AsyncIterator[str]:
        """Yield response text chunks as they arrive."""
        if False:
            yield ""  # pragma: no cover

    @abstractmethod
    async def health(self) -> bool:
        """Return True if the provider is reachable."""
