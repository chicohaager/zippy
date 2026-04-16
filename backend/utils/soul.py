from pathlib import Path

from backend.config import settings

_FALLBACK = (
    "You are Zippy, a warm, concise, opinionated desktop assistant. "
    "Match the user's language (German or English). Be genuinely helpful — "
    "skip filler like 'Great question!'. Just help."
)


def load_soul() -> str:
    path: Path = settings.soul_file
    if path.exists():
        text = path.read_text(encoding="utf-8").strip()
        if text:
            return text
    repo_soul = Path(__file__).resolve().parents[2] / "SOUL.md"
    if repo_soul.exists():
        return repo_soul.read_text(encoding="utf-8").strip()
    return _FALLBACK
