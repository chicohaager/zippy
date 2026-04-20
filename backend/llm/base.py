from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, AsyncIterator, Literal


Role = Literal["user", "assistant"]


@dataclass
class Message:
    role: Role
    content: str
    # Optional inline image (data URL: "data:image/jpeg;base64,...").
    # Only attached to the current turn's user message — not persisted.
    image: str | None = None


# Structured stream events. Providers yield dicts with a "type" discriminator so
# providers that support tool-use (Anthropic) can surface non-text events like
# "point" — the point_at Pointing-Prototyp signal for the desktop overlay.
StreamEvent = dict[str, Any]


class LLMProvider(ABC):
    name: str

    @abstractmethod
    async def stream(
        self,
        messages: list[Message],
        system: str,
        model: str,
    ) -> AsyncIterator[StreamEvent]:
        """Yield structured events. Always at least {type:"text", text:"..."}.
        Anthropic may additionally yield {type:"point", x, y, label}."""
        if False:
            yield {}  # pragma: no cover

    @abstractmethod
    async def health(self) -> bool:
        """Return True if the provider is reachable."""
