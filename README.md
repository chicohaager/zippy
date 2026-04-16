# Zippy

> A self-hosted, warm, opinionated AI desktop companion. Runs in Docker on Linux / ZimaOS.

Zippy is a modern-day [Clippy](https://en.wikipedia.org/wiki/Office_Assistant) —
redesigned for an age where the assistant on your desktop can actually help.
Chat with Claude (or a local Ollama model), with a UI that doesn't feel like
AI slop: warm creams, a terracotta accent, a friendly mascot.

![Zippy](frontend/public/zippy-mascot.svg)

## Status

**Phase 1 — MVP**

- [x] Project skeleton, Docker, single-container deploy
- [x] FastAPI backend with WebSocket streaming
- [x] Anthropic Claude integration (streaming)
- [x] Ollama integration (local models)
- [x] React + Tailwind frontend, retro-modern aesthetic
- [x] Markdown rendering with copy-able code blocks
- [x] Theme toggle (light / dark / system)
- [x] i18n (English / German)
- [x] SQLite conversation persistence
- [x] Animated Zippy mascot (idle / thinking / speaking)
- [ ] Voice input (Whisper) — Phase 2
- [ ] Voice output (Piper / Coqui) — Phase 2
- [ ] Conversation sidebar — Phase 2
- [ ] Settings panel — Phase 2

## Quick start (Docker)

```bash
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...

docker compose up --build
```

Open http://localhost:7860

## Local dev

Two terminals — backend on :7860, frontend dev server on :5173 (proxies API + WS
to the backend).

```bash
# Terminal 1 — backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd ..
DATA_DIR=./data SOUL_FILE=./SOUL.md uvicorn backend.main:app --reload --port 7860

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Configuration

All settings live in `.env` (see `.env.example`):

| Variable | Default | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required for Claude |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | For local models |
| `DEFAULT_PROVIDER` | `anthropic` | `anthropic` or `ollama` |
| `DEFAULT_MODEL` | `claude-sonnet-4-20250514` | |
| `PORT` | `7860` | |

## SOUL.md

Zippy's personality lives in `SOUL.md` at the repo root. It's mounted read-only
into the container at `/data/SOUL.md` and used as the system prompt. Edit it
to give Zippy a different voice.

## Architecture

```
┌──────────────────────────────────────────────┐
│              Docker Container                 │
├──────────────────────────────────────────────┤
│  Vite build → static files served by FastAPI │
│                                              │
│  Browser ─WS─► FastAPI ─► Provider Router    │
│                              ├─ Anthropic    │
│                              └─ Ollama       │
│                                              │
│  SQLite conversations at /data/zippy.sqlite  │
└──────────────────────────────────────────────┘
```

Backend routes:

- `GET /` — SPA (index.html)
- `WS /ws` — streaming chat
- `GET /api/status` — provider health
- `GET /api/providers` — available providers & models
- `GET /api/conversations` — list
- `GET /api/conversations/{id}` — detail
- `PATCH /api/conversations/{id}` — rename
- `DELETE /api/conversations/{id}` — delete

## ZimaOS

Data volume lives at `./data` (or `/data/zippy/` on ZimaOS).
The container runs entirely self-contained — no host `apt` dependencies.

## License

MIT
