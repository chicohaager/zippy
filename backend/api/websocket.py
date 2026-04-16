from __future__ import annotations

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.db import crud
from backend.llm.base import Message as LLMMessage
from backend.llm.router import get_provider
from backend.utils.soul import load_soul

router = APIRouter()
log = logging.getLogger("zippy.ws")


@router.websocket("/ws")
async def chat_ws(ws: WebSocket) -> None:
    await ws.accept()
    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "error": "invalid_json"})
                continue

            msg_type = data.get("type", "chat")
            if msg_type != "chat":
                await ws.send_json({"type": "error", "error": f"unknown_type:{msg_type}"})
                continue

            user_text: str = (data.get("text") or "").strip()
            provider_name: str | None = data.get("provider")
            model: str | None = data.get("model")
            conv_id: int | None = data.get("conversationId")

            if not user_text:
                await ws.send_json({"type": "error", "error": "empty_message"})
                continue

            if conv_id is None:
                title = user_text[:60] + ("…" if len(user_text) > 60 else "")
                conv = await crud.create_conversation(title=title)
                conv_id = conv.id
                await ws.send_json(
                    {"type": "conversation", "id": conv.id, "title": conv.title}
                )

            await crud.add_message(conv_id, "user", user_text)

            conv = await crud.get_conversation(conv_id)
            history: list[LLMMessage] = [
                LLMMessage(role=m.role, content=m.content)
                for m in (conv.messages if conv else [])
                if m.role in ("user", "assistant")
            ]

            try:
                provider = get_provider(provider_name)
            except ValueError as e:
                await ws.send_json({"type": "error", "error": str(e)})
                continue

            chosen_model = model or _default_model_for(provider.name)
            await ws.send_json(
                {"type": "start", "conversationId": conv_id, "provider": provider.name,
                 "model": chosen_model}
            )

            system = load_soul()
            buffer: list[str] = []
            try:
                async for chunk in provider.stream(history, system=system, model=chosen_model):
                    buffer.append(chunk)
                    await ws.send_json({"type": "delta", "text": chunk})
            except Exception as e:  # defensive: provider.stream should yield its own errors
                log.exception("provider stream crashed")
                await ws.send_json({"type": "error", "error": str(e)})
                continue

            full = "".join(buffer)
            if full:
                await crud.add_message(conv_id, "assistant", full)
            await ws.send_json({"type": "end", "conversationId": conv_id})
    except WebSocketDisconnect:
        return


def _default_model_for(provider: str) -> str:
    from backend.config import settings
    if provider == "anthropic":
        return settings.default_model if settings.default_model.startswith("claude") else "claude-sonnet-4-20250514"
    if provider == "ollama":
        return "qwen2.5"
    return settings.default_model
