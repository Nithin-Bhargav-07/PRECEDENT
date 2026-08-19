"""
PRECEDENT historical case domain models.
Strictly adheres to 02_DATA_MODEL.md.
"""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import CaseOutcomeType, CaseVerificationStatus
from app.models.factors import (
    REQUIRED_FACTOR_IDS,
    FactorCaseEvidence,
    validate_factor_map_keys,
)


class Citation(BaseModel):
    """Official documentation source validating historical incident facts."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., description="Unique citation key, e.g. CIT-ROGERS-1986")
    report_title: str = Field(
        ..., min_length=5, description="Full formal title of investigation report"
    )
    issuing_body: str = Field(..., min_length=2, description="Commission or agency")
    publication_year: int = Field(..., ge=1950, le=2030)
    document_number: str | None = None
    public_url: str | None = Field(None, description="Valid public web link to official archive")
    document_path: str | None = Field(None, description="Local path to the verified source document PDF")
    key_excerpts: list[str] = Field(
        default_factory=list, description="Verbatim factual excerpts"
    )


class KeyDecisionPoint(BaseModel):
    """Critical review or operational decision during a mission."""

    model_config = ConfigDict(extra="forbid")

    order: int
    timestamp_or_phase: str
    decision_description: str
    participating_roles: list[str]
    outcome_impact: str


class HistoricalCase(BaseModel):
    """Immutable record of a historical aerospace mission incident."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., pattern=r"^CASE-[A-Z0-9\-]+$")
    case_name: str = Field(..., min_length=3)
    mission_program: str
    incident_date: date
    outcome_type: CaseOutcomeType
    verification_status: CaseVerificationStatus = Field(default=CaseVerificationStatus.VERIFIED)
    situation_summary: str = Field(..., min_length=20)
    factors: dict[str, FactorCaseEvidence] = Field(
        ..., description="8 fixed factors keyed by ID"
    )
    key_decision_points: list[KeyDecisionPoint] = Field(default_factory=list)
    documented_contributing_factors: list[str] = Field(default_factory=list)
    documented_safeguards: list[str] = Field(default_factory=list)
    documented_response_actions: list[str] = Field(default_factory=list)
    citation: Citation
    secondary_citations: list[Citation] = Field(default_factory=list)

    @field_validator("factors")
    @classmethod
    def validate_required_factors(
        cls, value: dict[str, FactorCaseEvidence]
    ) -> dict[str, FactorCaseEvidence]:
        validate_factor_map_keys(value)
        missing = REQUIRED_FACTOR_IDS - set(value.keys())
        if missing:
            raise ValueError(f"Historical case missing mandatory factors: {sorted(missing)}")
        return value
