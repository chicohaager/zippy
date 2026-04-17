"""faster-whisper singleton. Model loads lazily on first call, cached thereafter."""
from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from faster_whisper import WhisperModel

from backend.config import settings

log = logging.getLogger("zippy.whisper")

_model: WhisperModel | None = None
_lock = asyncio.Lock()


async def _get_model() -> WhisperModel:
    global _model
    if _model is not None:
        return _model
    async with _lock:
        if _model is None:
            size = settings.whisper_model
            log.info("Loading faster-whisper model=%s (int8 CPU)…", size)
            # int8 on CPU keeps memory/latency reasonable on home-NAS hardware.
            _model = await asyncio.to_thread(
                WhisperModel, size, device="cpu", compute_type="int8"
            )
            log.info("faster-whisper ready")
    return _model


async def transcribe_file(path: Path, language: str | None = None) -> str:
    model = await _get_model()
    lang = language or settings.whisper_language or None
    if lang == "auto":
        lang = None

    def _run() -> str:
        segments, _info = model.transcribe(
            str(path),
            language=lang,
            vad_filter=True,
            beam_size=1,
        )
        return "".join(seg.text for seg in segments).strip()

    return await asyncio.to_thread(_run)
