from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM
    anthropic_api_key: str = ""
    ollama_base_url: str = "http://host.docker.internal:11434"
    default_provider: Literal["anthropic", "ollama"] = "anthropic"
    default_model: str = "claude-sonnet-4-20250514"

    # Speech (Phase 2)
    stt_provider: str = "whisper"
    tts_provider: str = "piper"
    whisper_model: str = "base"
    whisper_language: str = "de"
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = ""

    # Server
    host: str = "0.0.0.0"
    port: int = 7860
    log_level: str = "info"

    # Paths
    data_dir: Path = Path("/data")
    soul_file: Path = Path("/data/SOUL.md")

    @property
    def db_url(self) -> str:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        return f"sqlite+aiosqlite:///{self.data_dir}/zippy.sqlite"


settings = Settings()
