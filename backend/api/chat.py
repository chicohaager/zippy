from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.db import crud

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("")
async def list_conversations():
    convs = await crud.list_conversations()
    return [
        {"id": c.id, "title": c.title, "updated_at": c.updated_at.isoformat()}
        for c in convs
    ]


@router.get("/{conv_id}")
async def get_conversation(conv_id: int):
    conv = await crud.get_conversation(conv_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="conversation_not_found")
    return {
        "id": conv.id,
        "title": conv.title,
        "messages": [
            {"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
            for m in conv.messages
        ],
    }


@router.delete("/{conv_id}")
async def delete_conversation(conv_id: int):
    ok = await crud.delete_conversation(conv_id)
    if not ok:
        raise HTTPException(status_code=404, detail="conversation_not_found")
    return {"ok": True}


@router.patch("/{conv_id}")
async def rename_conversation(conv_id: int, body: dict):
    title = (body.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="empty_title")
    ok = await crud.rename_conversation(conv_id, title)
    if not ok:
        raise HTTPException(status_code=404, detail="conversation_not_found")
    return {"ok": True}
