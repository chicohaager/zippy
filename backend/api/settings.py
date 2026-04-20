from __future__ import annotations

import httpx
from fastapi import APIRouter

from backend.config import settings
from backend.llm.router import get_provider, list_providers

router = APIRouter(prefix="/api", tags=["settings"])


ANTHROPIC_MODELS = [
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-haiku-4-5",
]


async def _ollama_models() -> list[str]:
    """Query the configured Ollama daemon for its actual model list. Falls
    back to an empty list on any error — the UI then shows 'no models,
    pull one with ollama pull <name>'."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.ollama_base_url.rstrip('/')}/api/tags")
            if resp.status_code != 200:
                return []
            data = resp.json()
            return [m["name"] for m in data.get("models", []) if "name" in m]
    except Exception:
        return []


@router.get("/status")
async def status():
    providers = {}
    for name in list_providers():
        p = get_provider(name)
        providers[name] = await p.health()
    return {
        "defaultProvider": settings.default_provider,
        "defaultModel": settings.default_model,
        "providers": providers,
    }


@router.get("/providers")
async def providers():
    return {
        "providers": list_providers(),
        "default": settings.default_provider,
        "models": {
            "anthropic": ANTHROPIC_MODELS,
            "ollama": await _ollama_models(),
        },
    }
