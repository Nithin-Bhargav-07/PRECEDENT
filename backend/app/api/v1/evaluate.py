"""POST /api/v1/evaluate-precedent — Deterministic precedent evaluation endpoint."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.models.enums import SchedulePressureLevel
from app.models.factors import ExtractedFactorItem
from app.models.review import PrecedentAnalysisResult
from app.models.session import SessionAnalysisSummary
from app.repositories.case_repository import case_repository
from app.services.ai.explanation_service import generate_grounded_explanation
from app.services.engine.matcher import evaluate_situation
from app.api.v1.sessions import update_session_analysis

router = APIRouter(tags=["evaluation"])


class EvaluatePrecedentRequest(BaseModel):
    session_id: str = Field(..., min_length=3, max_length=100)
    title: str = Field(..., min_length=3, max_length=150)
    mission_context: str = Field(..., min_length=2, max_length=100)
    raw_description: str = Field(..., min_length=10, max_length=4000)
    confirmed_factors: dict[str, ExtractedFactorItem]


@router.post("/evaluate-precedent", response_model=PrecedentAnalysisResult)
async def evaluate_precedent(payload: EvaluatePrecedentRequest) -> PrecedentAnalysisResult:
    """
    Evaluate confirmed factors using pure deterministic matching.
    Optionally attaches IBM Granite grounded natural-language synthesis for matched cases.
    """
    from app.models.enums import CaseVerificationStatus
    from app.api.v1.sessions import _SESSIONS_STORE
    from fastapi import HTTPException, status

    session_record = _SESSIONS_STORE.get(payload.session_id)
    if not session_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review session '{payload.session_id}' not found."
        )
    if session_record.audit_action is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Review session '{payload.session_id}' has already been signed off and cannot be modified."
        )

    all_cases = [c for c in case_repository.get_all_cases() if c.verification_status == CaseVerificationStatus.VERIFIED]
    
    result = evaluate_situation(
        session_id=payload.session_id,
        situation_title=payload.title,
        situation_summary=payload.raw_description,
        confirmed_factors=payload.confirmed_factors,
        all_cases=all_cases,
    )

    # Attach grounded explanation using Granite if precedent was found (bypassed on abstention)
    explanation = generate_grounded_explanation(
        analysis_result=result,
        situation_title=payload.title,
        situation_summary=payload.raw_description,
    )
    result.grounded_explanation = explanation

    # Determine summary metrics from the top matched case (if any)
    top_case = result.matched_cases[0] if result.matched_cases else None
    
    if top_case:
        top_matched_case_names = [m.case_name for m in result.matched_cases if m.is_primary]
        top_breadth = len([k for k, v in (top_case.category_overlap or {}).items() if v > 0])
    else:
        top_matched_case_names = []
        top_breadth = None
    
    summary = SessionAnalysisSummary(
        status=result.status,
        top_matched_case_names=top_matched_case_names,
        overlap_score=top_case.overlap_score if top_case else None,
        category_breadth=top_breadth,
        counter_evidence_found=len(result.counter_evidence or []) > 0,
        matched_cases=result.matched_cases,
        confidence=result.confidence,
        counter_evidence=result.counter_evidence,
        grounded_explanation=result.grounded_explanation,
        abstention_detail=result.abstention_detail,
    )
    
    update_session_analysis(payload.session_id, summary, payload.confirmed_factors)

    return result
