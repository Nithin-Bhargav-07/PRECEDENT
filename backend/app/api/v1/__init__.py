"""API v1 route controllers."""

from fastapi import APIRouter

from app.api.v1.cases import router as cases_router
from app.api.v1.evaluate import router as evaluate_router
from app.api.v1.extract import router as extract_router
from app.api.v1.sessions import router as sessions_router
from app.api.v1.ingestion import router as ingestion_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(extract_router)
api_v1_router.include_router(evaluate_router)
api_v1_router.include_router(cases_router)
api_v1_router.include_router(sessions_router)
api_v1_router.include_router(ingestion_router)
