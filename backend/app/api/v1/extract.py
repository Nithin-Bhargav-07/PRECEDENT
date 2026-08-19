"""POST /api/v1/extract-factors — Granite factor extraction endpoint."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.models.factors import ExtractFactorsResponse
from app.services.ai.extraction_service import extract_factors_from_text

router = APIRouter(tags=["extraction"])


class ExtractFactorsRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    mission_context: str = Field(..., min_length=2, max_length=100)
    raw_description: str = Field(..., min_length=10, max_length=4000)
    session_id: str | None = None


@router.post("/extract-factors", response_model=ExtractFactorsResponse)
async def extract_factors(payload: ExtractFactorsRequest) -> ExtractFactorsResponse:
    """
    Extract 8 structured decision factors from unstructured mission review text
    using IBM Granite (restricted solely to factor extraction).
    """
    return extract_factors_from_text(
        title=payload.title,
        mission_context=payload.mission_context,
        raw_description=payload.raw_description,
        session_id=payload.session_id,
    )
