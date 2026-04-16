from __future__ import annotations

from backend.config import settings
from backend.llm.anthropic import AnthropicProvider
from backend.llm.base import LLMProvider
from backend.llm.ollama import OllamaProvider


_providers: dict[str, LLMProvider] = {
    "anthropic": AnthropicProvider(settings.anthropic_api_key),
    "ollama": OllamaProvider(settings.ollama_base_url),
}


def get_provider(name: str | None = None) -> LLMProvider:
    key = (name or settings.default_provider).lower()
    if key not in _providers:
        raise ValueError(f"Unknown provider: {key}")
    return _providers[key]


def list_providers() -> list[str]:
    return list(_providers.keys())
