from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.api import chat, settings as settings_api, websocket
from backend.config import settings
from backend.db import crud as db

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
log = logging.getLogger("zippy")


@asynccontextmanager
async def lifespan(_: FastAPI):
    await db.init_db()
    log.info("Zippy ready — provider=%s model=%s", settings.default_provider, settings.default_model)
    yield


app = FastAPI(title="Zippy", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(websocket.router)
app.include_router(chat.router)
app.include_router(settings_api.router)


_STATIC_DIR = Path(__file__).resolve().parent / "static"

if _STATIC_DIR.exists():
    # Serve built frontend (production)
    app.mount("/assets", StaticFiles(directory=_STATIC_DIR / "assets"), name="assets")

    @app.get("/")
    async def index():
        return FileResponse(_STATIC_DIR / "index.html")

    @app.get("/{path:path}")
    async def spa_fallback(path: str):
        # Serve real files if present; otherwise fall back to index.html for SPA routing.
        candidate = _STATIC_DIR / path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_STATIC_DIR / "index.html")
else:
    @app.get("/")
    async def index():
        return {
            "service": "zippy",
            "status": "ok",
            "note": "Frontend not built. Run `npm run build` in frontend/ or use `docker-compose up`.",
        }
