"""POST /api/v1/sessions — Review session audit endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
import uuid
import json
from pathlib import Path

from app.core.config import settings
from app.core.logging import get_logger

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AuditActionType, ConfidenceLevel, ReviewStatus
from app.models.factors import ExtractedFactorItem
from app.models.session import (
    AuditAction,
    AuditActionRequest,
    AuditActionResponse,
    ReviewSessionRecord,
    ReviewSessionSummary,
    SessionAnalysisSummary,
    SessionInputSnapshot,
    SessionSubmitter,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])

# In-memory audit session storage
_SESSIONS_STORE: dict[str, ReviewSessionRecord] = {}
logger = get_logger(__name__)

def _get_sessions_file_path() -> Path:
    path = Path(settings.sessions_data_path)
    if not path.is_absolute():
        alt_path = Path(__file__).resolve().parents[3] / path
        if alt_path.parent.exists():
            path = alt_path
    return path

def _load_sessions() -> None:
    global _SESSIONS_STORE
    path = _get_sessions_file_path()
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    record = ReviewSessionRecord.model_validate(item)
                    _SESSIONS_STORE[record.session_id] = record
            logger.info("Loaded %d sessions from %s", len(_SESSIONS_STORE), path)
        except Exception as e:
            logger.error("Failed to load sessions: %s", e)

def _save_sessions() -> None:
    path = _get_sessions_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        raw_data = [record.model_dump(mode="json") for record in _SESSIONS_STORE.values()]
        with open(path, "w", encoding="utf-8") as f:
            json.dump(raw_data, f, indent=2)
    except Exception as e:
        logger.error("Failed to save sessions: %s", e)

_load_sessions()

def update_session_analysis(session_id: str, summary: SessionAnalysisSummary) -> None:
    """Persist deterministic analysis results to the session audit record."""
    record = _SESSIONS_STORE.get(session_id)
    if record:
        record.analysis_result = summary
        record.updated_at = datetime.now(timezone.utc)
        _save_sessions()



class CreateSessionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=3, max_length=150)
    mission_context: str = Field(..., min_length=2, max_length=100)
    raw_description: str = Field(..., min_length=10, max_length=4000)
    submitter_role: str = "Chief Engineer / Mission Director"
    review_board: str = "Flight Readiness Review Board"
    extracted_factors: dict[str, ExtractedFactorItem] = Field(default_factory=dict)
    analysis_result: SessionAnalysisSummary | None = None


@router.post("", response_model=ReviewSessionRecord, status_code=status.HTTP_201_CREATED)
async def create_session(payload: CreateSessionRequest) -> ReviewSessionRecord:
    """Create a new immutable audit review session record."""
    session_id = f"SESS-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)
    record = ReviewSessionRecord(
        session_id=session_id,
        created_at=now,
        updated_at=now,
        submitter=SessionSubmitter(
            role=payload.submitter_role,
            review_board=payload.review_board,
        ),
        input=SessionInputSnapshot(
            title=payload.title,
            mission_context=payload.mission_context,
            raw_description=payload.raw_description,
        ),
        extracted_factors=payload.extracted_factors,
        analysis_result=payload.analysis_result,
        audit_action=None,
    )
    _SESSIONS_STORE[session_id] = record
    _save_sessions()
    return record


@router.get("", response_model=list[ReviewSessionSummary])
async def list_sessions() -> list[ReviewSessionSummary]:
    """List all review sessions for audit tracking."""
    summaries: list[ReviewSessionSummary] = []
    from typing import Literal
    for record in reversed(list(_SESSIONS_STORE.values())):
        action_val: AuditActionType | Literal["PENDING"] = record.audit_action.action if record.audit_action else "PENDING"
        top_cases = (
            record.analysis_result.top_matched_case_names
            if record.analysis_result
            else []
        )
        overlap = (
            record.analysis_result.overlap_score
            if record.analysis_result
            else None
        )
        breadth = (
            record.analysis_result.category_breadth
            if record.analysis_result
            else None
        )
        st = (
            record.analysis_result.status
            if record.analysis_result
            else ReviewStatus.NO_STRONG_PRECEDENT
        )

        summaries.append(
            ReviewSessionSummary(
                session_id=record.session_id,
                created_at=record.created_at,
                title=record.input.title,
                mission_context=record.input.mission_context,
                status=st,
                top_matched_case_names=top_cases,
                overlap_score=overlap,
                category_breadth=breadth,
                audit_action=action_val,
            )
        )
    return summaries


@router.get("/{session_id}", response_model=ReviewSessionRecord)
async def get_session(session_id: str) -> ReviewSessionRecord:
    """Retrieve full audit record for a session."""
    record = _SESSIONS_STORE.get(session_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review session '{session_id}' not found.",
        )
    return record


@router.post("/{session_id}/action", response_model=AuditActionResponse)
async def record_audit_action(session_id: str, payload: AuditActionRequest) -> AuditActionResponse:
    """Record engineer's final formal audit sign-off (ACKNOWLEDGED or DISMISSED)."""
    record = _SESSIONS_STORE.get(session_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review session '{session_id}' not found.",
        )

    if record.audit_action is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Review session '{session_id}' has already been signed off.",
        )

    now = datetime.now(timezone.utc)
    audit_entry = AuditAction(
        session_id=session_id,
        action=payload.action,
        engineer_notes=payload.engineer_notes,
        recorded_at=now,
    )
    record.audit_action = audit_entry
    record.updated_at = now
    _save_sessions()

    return AuditActionResponse(
        session_id=session_id,
        action=payload.action,
        recorded_at=now,
        status="SUCCESS",
    )
