"""GET /api/v1/cases — Historical case retrieval endpoints."""

from fastapi import APIRouter, HTTPException, status

from app.models.case import HistoricalCase
from app.repositories.case_repository import case_repository

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("", response_model=list[HistoricalCase])
async def list_historical_cases() -> list[HistoricalCase]:
    """Retrieve all structured historical cases in the library."""
    return case_repository.get_all_cases()


@router.get("/{case_id}", response_model=HistoricalCase)
async def get_historical_case(case_id: str) -> HistoricalCase:
    """Retrieve a single historical case by unique identifier."""
    case = case_repository.get_case_by_id(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Historical case with ID '{case_id}' not found.",
        )
    return case

@router.post("", response_model=HistoricalCase, status_code=status.HTTP_201_CREATED)
async def create_historical_case(case: HistoricalCase) -> HistoricalCase:
    """Submit a new historical case to the library."""
    try:
        from app.models.enums import CaseVerificationStatus
        case.verification_status = CaseVerificationStatus.USER_SUBMITTED
        case_repository.save_case(case)
        return case
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
