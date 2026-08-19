"""
PRECEDENT audit session models.
Strictly adheres to 02_DATA_MODEL.md §4.6 and §9.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import AuditActionType, ConfidenceLevel, ReviewStatus
from app.models.factors import ExtractedFactorItem, validate_factor_map_keys
class SessionInputSnapshot(BaseModel):
    """Situation input persisted on a review session audit record."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=3, max_length=150)
    mission_context: str = Field(..., min_length=2, max_length=100)
    raw_description: str = Field(..., min_length=10, max_length=4000)


class AuditAction(BaseModel):
    """Engineer's final interaction with a precedent flag."""

    model_config = ConfigDict(extra="forbid")

    session_id: str
    action: AuditActionType
    engineer_notes: str | None = None
    recorded_at: datetime = Field(default_factory=datetime.utcnow)


class AuditActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    action: AuditActionType
    engineer_notes: str | None = None


class AuditActionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    action: AuditActionType
    recorded_at: datetime = Field(default_factory=datetime.utcnow)
    status: Literal["SUCCESS"] = "SUCCESS"


class SessionSubmitter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: str
    review_board: str


class SessionAnalysisSummary(BaseModel):
    """Persisted summary of deterministic analysis attached to a session."""

    model_config = ConfigDict(extra="forbid")

    status: ReviewStatus
    top_matched_case_names: list[str] = Field(default_factory=list)
    overlap_score: float | None = None
    category_breadth: int | None = None
    counter_evidence_found: bool


class ReviewSessionRecord(BaseModel):
    """Complete immutable audit trail for a review session."""

    model_config = ConfigDict(extra="forbid")

    session_id: str
    created_at: datetime
    updated_at: datetime
    submitter: SessionSubmitter
    input: SessionInputSnapshot
    extracted_factors: dict[str, ExtractedFactorItem] = Field(default_factory=dict)
    analysis_result: SessionAnalysisSummary | None = None
    audit_action: AuditAction | None = None

    @field_validator("extracted_factors")
    @classmethod
    def validate_extracted_factors(
        cls, value: dict[str, ExtractedFactorItem]
    ) -> dict[str, ExtractedFactorItem]:
        return validate_factor_map_keys(value)


class ReviewSessionSummary(BaseModel):
    """Lightweight session listing entry."""

    model_config = ConfigDict(extra="forbid")

    session_id: str
    created_at: datetime
    title: str
    mission_context: str
    status: ReviewStatus
    top_matched_case_names: list[str]
    overlap_score: float | None
    category_breadth: int | None
    audit_action: AuditActionType | Literal["PENDING"]
