"""
PRECEDENT review request and analysis result models.
Strictly adheres to 02_DATA_MODEL.md.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.case import Citation, KeyDecisionPoint
from app.models.enums import (
    CaseOutcomeType,
    CaseVerificationStatus,
    ConfidenceLevel,
    FactorCategoryID,
    ReviewStatus,
    SchedulePressureLevel,
)
from app.models.factors import (
    ExtractedFactorItem,
    validate_factor_values,
)

PRECEDENT_DISCLAIMER = (
    "PRECEDENT provides historical precedent analysis for engineering review boards. "
    "It is not a recommendation, predictive model, or GO/NO-GO determination. "
    "Engineering judgment remains final."
)


class SituationInput(BaseModel):
    """Live engineering situation submitted for evaluation."""

    model_config = ConfigDict(extra="forbid")

    situation_id: str
    title: str = Field(..., min_length=3, max_length=150)
    mission_context: str = Field(..., min_length=2, max_length=100)
    raw_description: str = Field(..., min_length=10, max_length=4000)
    initial_factors: dict[str, bool | SchedulePressureLevel] | None = None

    @field_validator("initial_factors")
    @classmethod
    def validate_initial_factors(
        cls, value: dict[str, bool | SchedulePressureLevel] | None
    ) -> dict[str, bool | SchedulePressureLevel] | None:
        if value is None:
            return None
        return validate_factor_values(value)


class SituationInputRequest(BaseModel):
    """API request to submit a situation for factor extraction."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=3, max_length=150)
    mission_context: str = Field(..., min_length=2, max_length=100)
    raw_description: str = Field(..., min_length=10, max_length=4000)
    initial_factors: dict[str, bool | SchedulePressureLevel] | None = None

    @field_validator("initial_factors")
    @classmethod
    def validate_initial_factors(
        cls, value: dict[str, bool | SchedulePressureLevel] | None
    ) -> dict[str, bool | SchedulePressureLevel] | None:
        if value is None:
            return None
        return validate_factor_values(value)


class SharedFactorDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    factor_id: str
    factor_label: str
    category_id: FactorCategoryID
    situation_evidence: str
    historical_case_evidence: str


class DifferingFactorDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    factor_id: str
    factor_label: str
    category_id: FactorCategoryID
    situation_value: bool | SchedulePressureLevel
    case_value: bool | SchedulePressureLevel
    contrast_note: str


class PrecedentMatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    case_name: str
    mission_program: str
    incident_date: date
    outcome_type: CaseOutcomeType
    verification_status: CaseVerificationStatus
    situation_summary: str
    overlap_score: float = Field(ge=0.0, le=8.0)
    historical_overmatch: int = 0
    total_active_situation_factors: int
    category_overlap: dict[FactorCategoryID, int]
    shared_factors: list[SharedFactorDetail]
    differing_factors: list[DifferingFactorDetail]
    key_decision_points: list[KeyDecisionPoint]
    documented_contributing_factors: list[str]
    documented_safeguards: list[str]
    documented_response_actions: list[str]
    citation: Citation
    is_primary: bool = False
    is_tied: bool = False


class CounterEvidenceMatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    case_name: str
    mission_program: str
    incident_date: date
    shared_risk_factors: list[str]
    divergent_corrective_action: str
    documented_contributing_factors: list[str]
    documented_safeguards: list[str]
    documented_response_actions: list[str]
    citation: Citation


class ConfidenceAssessment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    level: ConfidenceLevel
    overlap_metric: str
    matched_critical_factors_count: int
    total_critical_factors_count: int
    rationale: str


class GroundedExplanation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    grounded_narrative: str = Field(..., min_length=20)
    grounded_facts_used: list[str] = Field(default_factory=list)
    model_id: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class ClosestCandidateCase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    case_name: str
    overlap_score: float


class AbstentionDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_abstaining: Literal[True] = True
    reason_code: Literal["INSUFFICIENT_FACTOR_OVERLAP", "SPARSE_INPUT_DATA"]
    message: str
    highest_overlap_found: int
    minimum_threshold_required: int
    closest_candidate_cases: list[ClosestCandidateCase] = Field(default_factory=list)


class EvaluatePrecedentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    situation_title: str
    situation_summary: str
    confirmed_factors: dict[str, ExtractedFactorItem]

    @field_validator("confirmed_factors")
    @classmethod
    def validate_confirmed_factors(
        cls, value: dict[str, ExtractedFactorItem]
    ) -> dict[str, ExtractedFactorItem]:
        # Validate keys via existing validator by transforming back temporarily
        flat = {k: v.value for k, v in value.items()}
        validate_factor_values(flat)
        return value


class PrecedentAnalysisResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    status: ReviewStatus
    matched_cases: list[PrecedentMatch]
    counter_evidence: list[CounterEvidenceMatch]
    confidence: ConfidenceAssessment
    grounded_explanation: GroundedExplanation | None = None
    abstention_detail: AbstentionDetail | None = None
    is_exact_tie: bool = False
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)
    disclaimer: str = PRECEDENT_DISCLAIMER
