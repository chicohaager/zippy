from __future__ import annotations

import logging
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend.audio.whisper import transcribe_file

log = logging.getLogger("zippy.transcribe")

router = APIRouter(prefix="/api", tags=["transcribe"])


# 25 MB hard cap — a minute of 48 kHz stereo opus is well under this.
MAX_BYTES = 25 * 1024 * 1024


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str | None = Form(None),
):
    blob = await audio.read()
    if not blob:
        raise HTTPException(status_code=400, detail="empty_audio")
    if len(blob) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="audio_too_large")

    suffix = Path(audio.filename or "audio").suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
        tmp.write(blob)
        tmp.flush()
        try:
            text = await transcribe_file(Path(tmp.name), language=language)
        except Exception as e:
            log.exception("transcribe failed")
            raise HTTPException(status_code=500, detail=f"transcribe_failed: {e}")

    return {"text": text}
