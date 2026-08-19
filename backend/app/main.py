"""FastAPI application entrypoint."""

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import api_v1_router
from app.core.config import settings
from app.core.logging import setup_logging

setup_logging()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="PRECEDENT — Learning from yesterday. Deciding for tomorrow.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sources_path = Path(__file__).parent.parent / "data" / "sources"
sources_path.mkdir(parents=True, exist_ok=True)
app.mount("/api/v1/sources", StaticFiles(directory=str(sources_path)), name="sources")

app.include_router(api_v1_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Health check endpoint for deployment verification."""
    return {"status": "ok", "service": settings.app_name}
