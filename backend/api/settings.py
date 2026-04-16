from __future__ import annotations

from fastapi import APIRouter

from backend.config import settings
from backend.llm.router import get_provider, list_providers

router = APIRouter(prefix="/api", tags=["settings"])


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
            "anthropic": [
                "claude-sonnet-4-20250514",
                "claude-opus-4-20250514",
                "claude-haiku-4-5",
            ],
            "ollama": ["qwen2.5", "llama3", "mistral"],
        },
    }
