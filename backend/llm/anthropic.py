from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator

from anthropic import AsyncAnthropic, APIError

from backend.llm.base import LLMProvider, Message, StreamEvent


log = logging.getLogger("zippy.anthropic")


# Anthropic tool definition — only sent on turns that include an image.
# Without a screenshot the coordinate space is undefined, so offering the
# tool would just invite hallucinated points.
POINT_TOOL: dict[str, Any] = {
    "name": "point_at",
    "description": (
        "Point at a specific location on the user's screen. Use only when a "
        "physical location matters more than a verbal description, and only "
        "after you've received a screenshot. Coordinates are normalized "
        "(0..1) over the captured image, origin top-left (x=0 is the left "
        "edge, y=0 is the top edge). Use sparingly — don't decorate every "
        "sentence with a point."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "x": {
                "type": "number",
                "minimum": 0,
                "maximum": 1,
                "description": "Horizontal position (0=left edge, 1=right edge).",
            },
            "y": {
                "type": "number",
                "minimum": 0,
                "maximum": 1,
                "description": "Vertical position (0=top edge, 1=bottom edge).",
            },
            "label": {
                "type": "string",
                "maxLength": 60,
                "description": "Very short label shown next to the point (optional).",
            },
        },
        "required": ["x", "y"],
    },
}


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
    ) -> AsyncIterator[StreamEvent]:
        if self._client is None:
            yield {
                "type": "text",
                "text": "[Zippy] No ANTHROPIC_API_KEY configured. Set it in .env and restart.",
            }
            return

        payload = [{"role": m.role, "content": _build_content(m)} for m in messages]
        has_image = any(m.image for m in messages)
        kwargs: dict[str, Any] = dict(
            model=model,
            max_tokens=2048,
            system=system,
            messages=payload,
        )
        if has_image:
            kwargs["tools"] = [POINT_TOOL]

        # Per-block bookkeeping. Anthropic streams events keyed by content-block
        # index; tool_use blocks deliver their JSON as input_json_delta chunks,
        # which we accumulate until the block stops.
        block_type: dict[int, str] = {}
        block_name: dict[int, str] = {}
        block_json: dict[int, str] = {}

        try:
            async with self._client.messages.stream(**kwargs) as stream:
                async for event in stream:
                    etype = getattr(event, "type", None)

                    if etype == "content_block_start":
                        idx = event.index
                        block = event.content_block
                        block_type[idx] = block.type
                        if block.type == "tool_use":
                            block_name[idx] = block.name
                            block_json[idx] = ""

                    elif etype == "content_block_delta":
                        idx = event.index
                        delta = event.delta
                        dtype = getattr(delta, "type", None)
                        if dtype == "text_delta":
                            yield {"type": "text", "text": delta.text}
                        elif dtype == "input_json_delta":
                            block_json[idx] = block_json.get(idx, "") + delta.partial_json

                    elif etype == "content_block_stop":
                        idx = event.index
                        if block_type.get(idx) == "tool_use" and block_name.get(idx) == "point_at":
                            raw = block_json.get(idx, "")
                            try:
                                args = json.loads(raw) if raw else {}
                            except json.JSONDecodeError:
                                log.warning("point_at tool_use: malformed JSON %r", raw)
                                continue
                            x = args.get("x")
                            y = args.get("y")
                            if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
                                log.warning("point_at without numeric x/y: %r", args)
                                continue
                            label = args.get("label")
                            yield {
                                "type": "point",
                                "x": float(x),
                                "y": float(y),
                                "label": label if isinstance(label, str) else None,
                            }
        except APIError as e:
            msg = e.message if hasattr(e, "message") else str(e)
            yield {"type": "text", "text": f"[Zippy] Anthropic API error: {msg}"}
        except Exception as e:
            yield {"type": "text", "text": f"[Zippy] Unexpected error: {e}"}

    async def health(self) -> bool:
        return self._client is not None
