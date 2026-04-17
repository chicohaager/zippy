"""Piper neural TTS. One voice model per language, lazy-loaded + cached on disk."""
from __future__ import annotations

import asyncio
import io
import logging
import wave
from pathlib import Path
from urllib.request import urlretrieve

from piper.voice import PiperVoice

log = logging.getLogger("zippy.piper")

# Persistent voice storage — mounted as a Docker volume.
VOICE_DIR = Path("/data/piper-voices")

# Voice choices: warm, teacher-friendly. Thorsten (DE) and Amy (EN) — medium
# quality is the sweet spot for naturalness vs. CPU cost.
VOICES = {
    "de": {
        "model": "de_DE-thorsten-medium.onnx",
        "config": "de_DE-thorsten-medium.onnx.json",
        "url_base": "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/",
    },
    "en": {
        "model": "en_US-amy-medium.onnx",
        "config": "en_US-amy-medium.onnx.json",
        "url_base": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/",
    },
}

_voices: dict[str, PiperVoice] = {}
_lock = asyncio.Lock()


def _ensure_downloaded(spec: dict) -> Path:
    VOICE_DIR.mkdir(parents=True, exist_ok=True)
    model_path = VOICE_DIR / spec["model"]
    config_path = VOICE_DIR / spec["config"]
    if not model_path.exists():
        log.info("Downloading Piper voice %s…", spec["model"])
        urlretrieve(spec["url_base"] + spec["model"] + "?download=true", model_path)
    if not config_path.exists():
        urlretrieve(spec["url_base"] + spec["config"] + "?download=true", config_path)
    return model_path


async def _get_voice(lang_prefix: str) -> PiperVoice:
    key = lang_prefix if lang_prefix in VOICES else "en"
    if key in _voices:
        return _voices[key]
    async with _lock:
        if key not in _voices:
            spec = VOICES[key]
            model_path = await asyncio.to_thread(_ensure_downloaded, spec)
            log.info("Loading Piper voice %s", key)
            _voices[key] = await asyncio.to_thread(PiperVoice.load, str(model_path))
    return _voices[key]


async def synthesize_wav(text: str, language: str = "en") -> bytes:
    voice = await _get_voice(language.split("-")[0].lower())

    def _run() -> bytes:
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            voice.synthesize(text, wf)
        return buf.getvalue()

    return await asyncio.to_thread(_run)
