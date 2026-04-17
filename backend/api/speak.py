from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from backend.audio.piper import synthesize_wav

log = logging.getLogger("zippy.speak")

router = APIRouter(prefix="/api", tags=["speak"])


class SpeakRequest(BaseModel):
    text: str
    language: str = "en"


MAX_CHARS = 4000


@router.post("/speak")
async def speak(req: SpeakRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="empty_text")
    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS]
    try:
        wav = await synthesize_wav(text, language=req.language)
    except Exception as e:
        log.exception("synthesize failed")
        raise HTTPException(status_code=500, detail=f"synth_failed: {e}")
    return Response(content=wav, media_type="audio/wav")
